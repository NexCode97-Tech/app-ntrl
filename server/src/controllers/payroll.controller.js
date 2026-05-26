import { pool } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import { calcularTransaccion } from "../validations/nomina.validation.js";
import { generateComprobantePDF, generateLiquidacionPDF } from "../utils/payrollPdf.js";

function requireAdminOrVendedor(req) {
  if (!["admin", "vendedor"].includes(req.user.role))
    throw new AppError("Acceso denegado.", 403, "FORBIDDEN");
}

const MESES = [
  "","Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

// ══════════════════════════════════════════════════════════════
// PERÍODOS
// ══════════════════════════════════════════════════════════════

// GET /payroll
export async function listPeriods(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const { rows } = await pool.query(`
      SELECT
        p.id, p.nombre, p.quincena, p.mes, p.anio,
        p.fecha_inicio, p.fecha_fin, p.estado,
        p.total_nomina, p.paid_at,
        u_c.name AS created_by_nombre,
        u_a.name AS approved_by_nombre,
        COUNT(pt.id)::int AS total_empleados,
        COALESCE(SUM(pt.neto_pagable), 0)::numeric AS total_calculado
      FROM payroll_periods p
      LEFT JOIN users u_c ON u_c.id = p.created_by
      LEFT JOIN users u_a ON u_a.id = p.approved_by
      LEFT JOIN payroll_transactions pt ON pt.period_id = p.id
      GROUP BY p.id, u_c.name, u_a.name
      ORDER BY p.anio DESC, p.mes DESC, p.quincena DESC
    `);
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

// GET /payroll/:id
export async function getPeriod(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const { rows } = await pool.query(`
      SELECT
        p.*,
        u_c.name AS created_by_nombre,
        u_a.name AS approved_by_nombre,
        COUNT(pt.id)::int AS total_empleados,
        COALESCE(SUM(pt.neto_pagable), 0)::numeric AS total_calculado,
        COALESCE(SUM(pt.total_devengado), 0)::numeric AS total_devengado,
        COALESCE(SUM(pt.total_deducido), 0)::numeric AS total_deducido
      FROM payroll_periods p
      LEFT JOIN users u_c ON u_c.id = p.created_by
      LEFT JOIN users u_a ON u_a.id = p.approved_by
      LEFT JOIN payroll_transactions pt ON pt.period_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, u_c.name, u_a.name
    `, [req.params.id]);
    if (!rows.length) throw new AppError("Período no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok", data: rows[0] });
  } catch (err) { next(err); }
}

// POST /payroll
// Crea el período Y genera automáticamente una transacción por cada empleado activo
export async function createPeriod(req, res, next) {
  const client = await pool.connect();
  try {
    requireAdminOrVendedor(req);
    await client.query("BEGIN");

    const { nombre, quincena, mes, anio, fecha_inicio, fecha_fin } = req.body;

    // Crear período
    const { rows: [period] } = await client.query(
      `INSERT INTO payroll_periods
         (nombre, quincena, mes, anio, fecha_inicio, fecha_fin, estado, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,'borrador',$7)
       RETURNING *`,
      [nombre, quincena, mes, anio, fecha_inicio, fecha_fin, req.user.id]
    );

    // Obtener empleados activos
    const { rows: empleados } = await client.query(
      `SELECT id, nombre, cargo, salario_base, tipo_contrato,
              banco, tipo_cuenta, numero_cuenta, anticipo_prest_fijo
       FROM employees WHERE estado_laboral = 'activo' ORDER BY nombre ASC`
    );

    // Generar transacción por empleado con cálculos iniciales
    for (const emp of empleados) {
      const tx = calcularTransaccion(emp);
      await client.query(
        `INSERT INTO payroll_transactions
           (employee_id, period_id,
            tipo_contrato_snap, salario_base_snap, dias_laborados,
            basico, aux_transporte, anticipo_prestaciones, horas_extras,
            otros_ingresos, total_devengado,
            salud, pension, anticipo_adelanto, funeral,
            otros_descuentos, descuento_horas_extras, total_deducido, neto_pagable, observaciones)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
        [
          emp.id, period.id,
          tx.tipo_contrato_snap, tx.salario_base_snap, tx.dias_laborados,
          tx.basico, tx.aux_transporte, tx.anticipo_prestaciones, tx.horas_extras,
          tx.otros_ingresos, tx.total_devengado,
          tx.salud, tx.pension, tx.anticipo_adelanto, tx.funeral,
          tx.otros_descuentos, tx.descuento_horas_extras, tx.total_deducido, tx.neto_pagable, null,
        ]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({
      status: "ok",
      data: { ...period, total_empleados: empleados.length },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally { client.release(); }
}

// DELETE /payroll/:id
export async function deletePeriod(req, res, next) {
  try {
    if (req.user.role !== "admin") throw new AppError("Solo administradores.", 403, "FORBIDDEN");
    const { rows } = await pool.query(
      `SELECT estado FROM payroll_periods WHERE id = $1`, [req.params.id]
    );
    if (!rows.length) throw new AppError("Período no encontrado.", 404, "NOT_FOUND");

    await pool.query(`DELETE FROM payroll_periods WHERE id = $1`, [req.params.id]);
    res.json({ status: "ok", message: "Período eliminado." });
  } catch (err) { next(err); }
}

// ══════════════════════════════════════════════════════════════
// TRANSACCIONES (filas de empleados dentro de un período)
// ══════════════════════════════════════════════════════════════

// GET /payroll/:id/transactions
export async function listTransactions(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const { rows } = await pool.query(`
      SELECT
        pt.*,
        e.nombre      AS empleado_nombre,
        e.cargo       AS empleado_cargo,
        e.banco       AS empleado_banco,
        e.tipo_cuenta AS empleado_tipo_cuenta,
        e.numero_cuenta AS empleado_numero_cuenta,
        e.hora_entrada AS empleado_hora_entrada,
        e.hora_salida  AS empleado_hora_salida
      FROM payroll_transactions pt
      JOIN employees e ON e.id = pt.employee_id
      WHERE pt.period_id = $1
      ORDER BY e.nombre ASC
    `, [req.params.id]);
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

// PATCH /payroll/:id/transactions/:txId
// Edita los campos variables de un empleado y recalcula todo
export async function updateTransaction(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const { id: periodId, txId } = req.params;

    // Verificar que el período esté en borrador
    const { rows: [period] } = await pool.query(
      `SELECT estado FROM payroll_periods WHERE id = $1`, [periodId]
    );
    if (!period) throw new AppError("Período no encontrado.", 404, "NOT_FOUND");
    if (period.estado !== "borrador")
      throw new AppError("Solo se pueden editar períodos en estado borrador.", 400, "BAD_REQUEST");

    // Obtener snapshot del empleado en la transacción
    const { rows: [tx] } = await pool.query(
      `SELECT pt.*, e.tipo_contrato, e.anticipo_prest_fijo
       FROM payroll_transactions pt
       JOIN employees e ON e.id = pt.employee_id
       WHERE pt.id = $1 AND pt.period_id = $2`,
      [txId, periodId]
    );
    if (!tx) throw new AppError("Transacción no encontrada.", 404, "NOT_FOUND");

    // Recalcular con los nuevos campos editables
    const empSnap = {
      tipo_contrato: tx.tipo_contrato_snap,
      salario_base:  tx.salario_base_snap,
      anticipo_prest_fijo: tx.anticipo_prest_fijo,
    };
    const nuevos = calcularTransaccion(empSnap, {
      dias_laborados:          req.body.dias_laborados          ?? tx.dias_laborados,
      anticipo_prestaciones:   req.body.anticipo_prestaciones   ?? tx.anticipo_prestaciones,
      horas_extras:            req.body.horas_extras            ?? tx.horas_extras,
      otros_ingresos:          req.body.otros_ingresos          ?? tx.otros_ingresos,
      anticipo_adelanto:       req.body.anticipo_adelanto       ?? tx.anticipo_adelanto,
      funeral:                 req.body.funeral                 ?? tx.funeral,
      otros_descuentos:        req.body.otros_descuentos        ?? tx.otros_descuentos,
      descuento_horas_extras:  req.body.descuento_horas_extras  ?? tx.descuento_horas_extras ?? 0,
      observaciones:           req.body.observaciones           ?? tx.observaciones,
    });

    const { rows: [updated] } = await pool.query(
      `UPDATE payroll_transactions SET
         dias_laborados=$1, basico=$2, aux_transporte=$3,
         anticipo_prestaciones=$4, horas_extras=$5, otros_ingresos=$6,
         total_devengado=$7, salud=$8, pension=$9,
         anticipo_adelanto=$10, funeral=$11, otros_descuentos=$12,
         descuento_horas_extras=$13, total_deducido=$14, neto_pagable=$15, observaciones=$16
       WHERE id=$17 AND period_id=$18
       RETURNING *`,
      [
        nuevos.dias_laborados, nuevos.basico, nuevos.aux_transporte,
        nuevos.anticipo_prestaciones, nuevos.horas_extras, nuevos.otros_ingresos,
        nuevos.total_devengado, nuevos.salud, nuevos.pension,
        nuevos.anticipo_adelanto, nuevos.funeral, nuevos.otros_descuentos,
        nuevos.descuento_horas_extras, nuevos.total_deducido, nuevos.neto_pagable, nuevos.observaciones,
        txId, periodId,
      ]
    );

    res.json({ status: "ok", data: updated });
  } catch (err) { next(err); }
}

// ══════════════════════════════════════════════════════════════
// ACCIONES DEL PERÍODO
// ══════════════════════════════════════════════════════════════

// POST /payroll/:id/approve
export async function approvePeriod(req, res, next) {
  const client = await pool.connect();
  try {
    requireAdminOrVendedor(req);
    await client.query("BEGIN");

    const { rows: [period] } = await client.query(
      `SELECT * FROM payroll_periods WHERE id = $1`, [req.params.id]
    );
    if (!period) throw new AppError("Período no encontrado.", 404, "NOT_FOUND");
    if (period.estado !== "borrador")
      throw new AppError("Solo se pueden aprobar períodos en borrador.", 400, "BAD_REQUEST");

    // Calcular total final
    const { rows: [totals] } = await client.query(
      `SELECT COALESCE(SUM(neto_pagable), 0)::numeric AS total
       FROM payroll_transactions WHERE period_id = $1`, [req.params.id]
    );

    const { rows: [updated] } = await client.query(
      `UPDATE payroll_periods SET
         estado='aprobado', approved_by=$1, approved_at=NOW(), total_nomina=$2
       WHERE id=$3 RETURNING *`,
      [req.user.id, totals.total, req.params.id]
    );

    await client.query("COMMIT");
    res.json({ status: "ok", data: updated });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally { client.release(); }
}

// POST /payroll/:id/mark-paid
export async function markAsPaid(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const { rows: [period] } = await pool.query(
      `SELECT estado FROM payroll_periods WHERE id = $1`, [req.params.id]
    );
    if (!period) throw new AppError("Período no encontrado.", 404, "NOT_FOUND");
    if (period.estado !== "aprobado")
      throw new AppError("Solo se pueden marcar como pagados períodos aprobados.", 400, "BAD_REQUEST");

    const { rows: [updated] } = await pool.query(
      `UPDATE payroll_periods SET estado='pagado', paid_at=NOW(), paid_by=$1
       WHERE id=$2 RETURNING *`,
      [req.user.id, req.params.id]
    );
    res.json({ status: "ok", data: updated });
  } catch (err) { next(err); }
}

// ══════════════════════════════════════════════════════════════
// EXPORTACIONES
// ══════════════════════════════════════════════════════════════

// GET /payroll/:id/export/banco
// Descarga CSV listo para gestionar las transferencias bancarias
export async function exportBanco(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const { rows: [period] } = await pool.query(
      `SELECT * FROM payroll_periods WHERE id = $1`, [req.params.id]
    );
    if (!period) throw new AppError("Período no encontrado.", 404, "NOT_FOUND");
    if (!["aprobado","pagado"].includes(period.estado))
      throw new AppError("El período debe estar aprobado para exportar.", 400, "BAD_REQUEST");

    const { rows: txs } = await pool.query(`
      SELECT
        e.nombre, e.banco, e.tipo_cuenta, e.numero_cuenta,
        pt.neto_pagable
      FROM payroll_transactions pt
      JOIN employees e ON e.id = pt.employee_id
      WHERE pt.period_id = $1
      ORDER BY e.nombre ASC
    `, [req.params.id]);

    // Generar CSV
    const header = "N°,NOMBRE,BANCO/CUENTA,NUMERO,FORMA DE PAGO,VALOR TOTAL";
    const lines = txs.map((t, i) => [
      i + 1,
      t.nombre,
      (t.tipo_cuenta || t.banco || "").toUpperCase(),
      t.numero_cuenta || "",
      "TRANSFERENCIA",
      Math.round(Number(t.neto_pagable)),
    ].join(","));

    const totalLine = `,,,,TOTAL,${txs.reduce((s, t) => s + Math.round(Number(t.neto_pagable)), 0)}`;
    const csv = [header, ...lines, totalLine].join("\n");

    const filename = `banco_${period.nombre.replace(/\s+/g, "_")}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("﻿" + csv); // BOM para que Excel abra bien en español
  } catch (err) { next(err); }
}

// GET /payroll/:id/export/comprobante/:txId
// Genera la tirilla de pago en PDF
export async function getComprobante(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const { id: periodId, txId } = req.params;

    const { rows: [data] } = await pool.query(`
      SELECT
        pt.*,
        e.nombre, e.cargo, e.numero_identificacion, e.tipo_identificacion,
        e.banco, e.tipo_cuenta, e.numero_cuenta,
        p.nombre AS periodo_nombre, p.quincena, p.mes, p.anio,
        p.fecha_inicio, p.fecha_fin
      FROM payroll_transactions pt
      JOIN employees e ON e.id = pt.employee_id
      JOIN payroll_periods p ON p.id = pt.period_id
      WHERE pt.id = $1 AND pt.period_id = $2
    `, [txId, periodId]);

    if (!data) throw new AppError("Comprobante no encontrado.", 404, "NOT_FOUND");

    const pdfBuffer = await generateComprobantePDF(data, MESES);
    const filename  = `comprobante_${data.nombre.replace(/\s+/g, "_")}_${data.periodo_nombre?.replace(/\s+/g, "_") ?? periodId}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
}

// GET /payroll/employees/:empId/liquidacion?fecha_retiro=YYYY-MM-DD
// Calcula y descarga la liquidación de un empleado
export async function getLiquidacion(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const { empId } = req.params;
    const fecha_retiro = req.query.fecha_retiro
      ? new Date(req.query.fecha_retiro)
      : new Date();

    const { rows: [emp] } = await pool.query(
      `SELECT id, nombre, cargo, salario_base, tipo_contrato,
              tipo_identificacion, numero_identificacion, fecha_ingreso
       FROM employees WHERE id = $1`,
      [empId]
    );
    if (!emp) throw new AppError("Empleado no encontrado.", 404, "NOT_FOUND");

    const ingreso  = new Date(emp.fecha_ingreso);
    const salario  = Number(emp.salario_base);

    // Días trabajados totales (entre ingreso y retiro)
    const msDiff   = fecha_retiro - ingreso;
    const diasTotal = Math.max(0, Math.round(msDiff / (1000 * 60 * 60 * 24)));

    // Fórmulas ley colombiana
    const cesantias           = Math.round((salario * diasTotal) / 360);
    const intereses_cesantias = Math.round((cesantias * diasTotal * 0.12) / 360);
    const prima               = Math.round((salario * diasTotal) / 360);
    const vacaciones          = Math.round((salario * diasTotal) / 720);
    const total               = cesantias + intereses_cesantias + prima + vacaciones;

    const liqData = {
      ...emp,
      fecha_ingreso:        ingreso,
      fecha_retiro,
      dias_trabajados:      diasTotal,
      salario_base:         salario,
      cesantias,
      intereses_cesantias,
      prima,
      vacaciones,
      total,
    };

    const pdfBuffer = await generateLiquidacionPDF(liqData);
    const filename  = `liquidacion_${emp.nombre.replace(/\s+/g, "_")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
}
