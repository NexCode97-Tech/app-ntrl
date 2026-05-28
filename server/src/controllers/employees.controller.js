import { pool } from "../config/database.js";
import { AppError } from "../utils/AppError.js";
import { saveFile, deleteFile } from "../utils/fileStorage.js";

function requireAdminOrVendedor(req) {
  if (!["admin", "vendedor"].includes(req.user.role))
    throw new AppError("Acceso denegado.", 403, "FORBIDDEN");
}

// ── LIST ───────────────────────────────────────────────────────
export async function listEmployees(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const { estado, q } = req.query;
    const params = [];
    let where = "WHERE 1=1";

    if (estado) { params.push(estado); where += ` AND e.estado_laboral = $${params.length}`; }
    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      where += ` AND (LOWER(e.nombre) LIKE $${params.length} OR LOWER(e.cargo) LIKE $${params.length} OR e.numero_identificacion LIKE $${params.length})`;
    }

    const { rows } = await pool.query(
      `SELECT e.id, e.nombre, e.email, e.cargo, e.salario_base,
              e.tipo_contrato, e.banco, e.tipo_cuenta, e.numero_cuenta,
              e.anticipo_prest_fijo, e.tipo_identificacion, e.numero_identificacion,
              e.fecha_ingreso, e.estado_laboral, e.notas, e.cv_url, e.created_at
       FROM employees e ${where} ORDER BY e.nombre ASC`,
      params
    );
    res.json({ status: "ok", data: rows });
  } catch (err) { next(err); }
}

// ── GET ONE ────────────────────────────────────────────────────
export async function getEmployee(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const { rows } = await pool.query(
      `SELECT * FROM employees WHERE id = $1`, [req.params.id]
    );
    if (!rows.length) throw new AppError("Empleado no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok", data: rows[0] });
  } catch (err) { next(err); }
}

// ── CREATE ─────────────────────────────────────────────────────
export async function createEmployee(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const b = req.body;
    const { rows } = await pool.query(
      `INSERT INTO employees
         (nombre, email, cargo, salario_base, tipo_contrato,
          banco, tipo_cuenta, numero_cuenta, anticipo_prest_fijo,
          tipo_identificacion, numero_identificacion,
          fecha_ingreso, estado_laboral, notas,
          hora_entrada, hora_salida)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        b.nombre, b.email || null, b.cargo, b.salario_base,
        b.tipo_contrato,
        b.banco || null, b.tipo_cuenta || "nequi",
        b.numero_cuenta || null, b.anticipo_prest_fijo ?? 0,
        b.tipo_identificacion || "CC", b.numero_identificacion,
        b.fecha_ingreso, b.estado_laboral || "activo",
        b.notas || null,
        b.hora_entrada || "07:00", b.hora_salida || "17:00",
      ]
    );
    res.status(201).json({ status: "ok", data: rows[0] });
  } catch (err) {
    if (err.code === "23505") return next(new AppError("Ya existe un empleado con ese número de identificación.", 409, "CONFLICT"));
    next(err);
  }
}

// ── UPDATE ─────────────────────────────────────────────────────
export async function updateEmployee(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const { id } = req.params;
    const allowed = [
      "nombre","email","cargo","salario_base","tipo_contrato",
      "banco","tipo_cuenta","numero_cuenta","anticipo_prest_fijo",
      "tipo_identificacion","numero_identificacion",
      "fecha_ingreso","estado_laboral","notas",
      "hora_entrada","hora_salida",
    ];

    const sets = [];
    const params = [id];
    for (const key of allowed) {
      if (key in req.body) {
        params.push(req.body[key] ?? null);
        sets.push(`${key} = $${params.length}`);
      }
    }
    if (!sets.length) throw new AppError("No hay campos para actualizar.", 400, "BAD_REQUEST");

    const { rows } = await pool.query(
      `UPDATE employees SET ${sets.join(", ")} WHERE id = $1 RETURNING *`, params
    );
    if (!rows.length) throw new AppError("Empleado no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok", data: rows[0] });
  } catch (err) {
    if (err.code === "23505") return next(new AppError("Ya existe un empleado con ese número de identificación.", 409, "CONFLICT"));
    next(err);
  }
}

// ── UPLOAD CV ──────────────────────────────────────────────────
export async function uploadCV(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    if (!req.file) throw new AppError("No se recibió ningún archivo.", 400, "NO_FILE");

    const { rows: [emp] } = await pool.query(`SELECT cv_url FROM employees WHERE id = $1`, [req.params.id]);
    if (!emp) throw new AppError("Empleado no encontrado.", 404, "NOT_FOUND");

    // Eliminar CV anterior si existe
    if (emp.cv_url) {
      await deleteFile(emp.cv_url).catch(() => {});
    }

    const url = await saveFile(req.file, "employees/cv");
    const { rows: [updated] } = await pool.query(
      `UPDATE employees SET cv_url = $1 WHERE id = $2 RETURNING *`,
      [url, req.params.id]
    );
    res.json({ status: "ok", data: updated });
  } catch (err) { next(err); }
}

// ── DELETE CV ──────────────────────────────────────────────────
export async function deleteCV(req, res, next) {
  try {
    requireAdminOrVendedor(req);
    const { rows: [emp] } = await pool.query(`SELECT cv_url FROM employees WHERE id = $1`, [req.params.id]);
    if (!emp) throw new AppError("Empleado no encontrado.", 404, "NOT_FOUND");
    if (!emp.cv_url) throw new AppError("El empleado no tiene hoja de vida registrada.", 404, "NOT_FOUND");

    await deleteFile(emp.cv_url).catch(() => {});
    const { rows: [updated] } = await pool.query(
      `UPDATE employees SET cv_url = NULL WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    res.json({ status: "ok", data: updated });
  } catch (err) { next(err); }
}

// ── DELETE ─────────────────────────────────────────────────────
export async function deleteEmployee(req, res, next) {
  try {
    if (req.user.role !== "admin") throw new AppError("Solo administradores pueden eliminar empleados.", 403, "FORBIDDEN");
    const { id } = req.params;
    const { rows: txs } = await pool.query(
      `SELECT id FROM payroll_transactions WHERE employee_id = $1 LIMIT 1`, [id]
    );
    if (txs.length) throw new AppError(
      "El empleado tiene nóminas registradas. Cambia su estado a 'terminado' en lugar de eliminar.",
      409, "CONFLICT"
    );
    const { rows } = await pool.query(`DELETE FROM employees WHERE id = $1 RETURNING id`, [id]);
    if (!rows.length) throw new AppError("Empleado no encontrado.", 404, "NOT_FOUND");
    res.json({ status: "ok", message: "Empleado eliminado." });
  } catch (err) { next(err); }
}
