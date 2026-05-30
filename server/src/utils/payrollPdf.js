/**
 * PDFs de nómina: tirilla de pago (comprobante) y liquidación laboral.
 */
import PDFDocument from "pdfkit";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = join(__dirname, "../assets/logo.png");

const GREEN = "#22c55e";
const BLACK = "#111111";
const GRAY  = "#555555";
const LGRAY = "#f5f5f5";
const WHITE = "#ffffff";

const EMPRESA = {
  nombre:    "Natural Ropa Deportiva",
  nit:       "91156614-3",
  direccion: "Calle 22#17-21",
  ciudad:    "Bucaramanga, Santander",
  tel:       "+57 (313) 829 6551",
  web:       "www.naturalropadeportiva.com.co",
};

const fmt = (n) => `$${Math.round(Number(n || 0)).toLocaleString("es-CO")}`;

/* ─── RENDER INTERNO (reutilizable) ────────────────────────────── */
function _renderComprobante(doc, data, MESES) {
  const W  = 255;
  const m  = 14;
  const cW = W - m * 2;

  const mesNombre = (MESES || [])[data.mes] || "";
  const quincena  = data.quincena === 1 ? "Primera" : "Segunda";
  const esLaboral = data.tipo_contrato_snap === "laboral";

  let y = m;

  // Logo
  try {
    doc.image(LOGO_PATH, m + (cW - 70) / 2, y, { height: 32, fit: [70, 32] });
    y += 36;
  } catch { /* sin logo */ }

  // Cabecera empresa
  doc.fontSize(7).fillColor(GRAY).font("Helvetica")
     .text("NATURAL ROPA DEPORTIVA", m, y, { align: "center", width: cW }); y += 10;
  doc.fontSize(6).fillColor(GRAY)
     .text(`NIT: ${EMPRESA.nit}  ·  Bucaramanga`, m, y, { align: "center", width: cW }); y += 8;
  doc.text(EMPRESA.tel, m, y, { align: "center", width: cW }); y += 12;

  // Título
  doc.moveTo(m, y).lineTo(W - m, y).lineWidth(1).strokeColor(GREEN).stroke(); y += 5;
  doc.fontSize(8.5).fillColor(BLACK).font("Helvetica-Bold")
     .text("COMPROBANTE DE NÓMINA", m, y, { align: "center", width: cW }); y += 12;
  doc.fontSize(7).fillColor(GRAY).font("Helvetica")
     .text(`${quincena} Quincena  ·  ${mesNombre} ${data.anio}`, m, y, { align: "center", width: cW }); y += 10;
  doc.moveTo(m, y).lineTo(W - m, y).lineWidth(0.4).strokeColor("#bbbbbb").stroke(); y += 7;

  function row(label, value, opts = {}) {
    doc.fontSize(6.8).fillColor(GRAY).font("Helvetica")
       .text(label, m, y, { width: cW * 0.5 });
    doc.fontSize(6.8).fillColor(opts.color || BLACK)
       .font(opts.bold ? "Helvetica-Bold" : "Helvetica")
       .text(value, m, y, { width: cW, align: "right" });
    y += 10;
  }

  // Datos empleado
  row("Nombre:", data.nombre, { bold: true });
  row("Cargo:", data.cargo);
  row(`${data.tipo_identificacion}:`, data.numero_identificacion);
  row("Días laborados:", String(data.dias_laborados));
  row("Salario base:", fmt(data.salario_base_snap));
  y += 3;

  // ── Devengados ──
  doc.moveTo(m, y).lineTo(W - m, y).lineWidth(0.3).strokeColor("#cccccc").stroke(); y += 5;
  doc.fontSize(7).fillColor(GREEN).font("Helvetica-Bold")
     .text("DEVENGADOS", m, y, { width: cW }); y += 11;
  row("Básico:", fmt(data.basico));
  if (esLaboral && Number(data.aux_transporte) > 0)
    row("Aux. transporte:", fmt(data.aux_transporte));
  if (!esLaboral && Number(data.anticipo_prestaciones) > 0)
    row("Anticipo prestaciones:", fmt(data.anticipo_prestaciones));
  if (Number(data.horas_extras) > 0)
    row("Horas extras:", fmt(data.horas_extras));
  if (Number(data.otros_ingresos) > 0)
    row("Otros ingresos:", fmt(data.otros_ingresos));
  row("TOTAL DEVENGADO:", fmt(data.total_devengado), { bold: true });
  y += 3;

  // ── Descuentos ──
  doc.moveTo(m, y).lineTo(W - m, y).lineWidth(0.3).strokeColor("#cccccc").stroke(); y += 5;
  doc.fontSize(7).fillColor("#ef4444").font("Helvetica-Bold")
     .text("DESCUENTOS", m, y, { width: cW }); y += 11;
  if (esLaboral && Number(data.salud) > 0)
    row("Salud (4%):", fmt(data.salud), { color: "#ef4444" });
  if (esLaboral && Number(data.pension) > 0)
    row("Pensión (4%):", fmt(data.pension), { color: "#ef4444" });
  if (Number(data.anticipo_adelanto) > 0)
    row("Anticipo/Adelanto:", fmt(data.anticipo_adelanto), { color: "#ef4444" });
  if (Number(data.funeral) > 0)
    row("Fondo funeral:", fmt(data.funeral), { color: "#ef4444" });
  if (Number(data.descuento_horas_extras) > 0)
    row("Desc. horas pendientes:", fmt(data.descuento_horas_extras), { color: "#ef4444" });
  if (Number(data.otros_descuentos) > 0)
    row("Otros descuentos:", fmt(data.otros_descuentos), { color: "#ef4444" });
  row("TOTAL DEDUCIDO:", fmt(data.total_deducido), { bold: true, color: "#ef4444" });
  y += 5;

  // ── Neto ──
  doc.moveTo(m, y).lineTo(W - m, y).lineWidth(1).strokeColor(GREEN).stroke(); y += 5;
  doc.rect(m, y, cW, 20).fill(GREEN);
  doc.fontSize(9).fillColor(WHITE).font("Helvetica-Bold")
     .text("NETO A PAGAR:", m + 5, y + 5, { width: cW * 0.5, lineBreak: false });
  doc.text(fmt(data.neto_pagable), m, y + 5, { width: cW - 5, align: "right", lineBreak: false });
  y += 25;

  // Datos bancarios
  if (data.tipo_cuenta || data.banco || data.numero_cuenta) {
    doc.moveTo(m, y).lineTo(W - m, y).lineWidth(0.3).strokeColor("#cccccc").stroke(); y += 6;
    doc.fontSize(6.5).fillColor(GRAY).font("Helvetica")
       .text("Forma de pago: Transferencia bancaria", m, y, { width: cW }); y += 9;
    if (data.tipo_cuenta || data.banco)
      row("Banco:", (data.tipo_cuenta || data.banco).toUpperCase());
    if (data.numero_cuenta)
      row("N° cuenta:", data.numero_cuenta);
  }

  // Observaciones
  if (data.observaciones) {
    y += 3;
    doc.fontSize(6.5).fillColor(GRAY).font("Helvetica")
       .text(`Obs: ${data.observaciones}`, m, y, { width: cW }); y += 12;
  }

  // Firmas
  y += 12;
  const sigW = cW * 0.40;
  doc.moveTo(m, y).lineTo(m + sigW, y).lineWidth(0.5).strokeColor("#aaaaaa").stroke();
  doc.moveTo(W - m - sigW, y).lineTo(W - m, y).lineWidth(0.5).strokeColor("#aaaaaa").stroke();
  y += 5;
  doc.fontSize(6).fillColor(GRAY).font("Helvetica")
     .text("Firma empleador", m, y, { width: sigW, align: "center" });
  doc.text("Firma trabajador", W - m - sigW, y, { width: sigW, align: "center" });
  y += 16;

  // Pie
  doc.moveTo(m, y).lineTo(W - m, y).lineWidth(0.5).strokeColor(GREEN).stroke(); y += 6;
  doc.fontSize(5.5).fillColor(GRAY).font("Helvetica")
     .text(EMPRESA.web, m, y, { align: "center", width: cW }); y += 8;
  doc.text(`Generado: ${new Date().toLocaleDateString("es-CO")}`, m, y, { align: "center", width: cW }); y += 10;

  return y; // devuelve posición final para ajustar alto de página
}

/* ─── TIRILLA DE PAGO INDIVIDUAL ───────────────────────────────── */
export function generateComprobantePDF(data, MESES) {
  return new Promise((resolve, reject) => {
    const W   = 255;
    const m   = 14;
    const doc = new PDFDocument({ margin: m, size: [W, 900], autoFirstPage: true });
    const chunks = [];
    doc.on("data",  (c) => chunks.push(c));
    doc.on("end",   () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const y = _renderComprobante(doc, data, MESES);
    doc.page.height = y + m; // ajustar alto al contenido real
    doc.end();
  });
}

/* ─── NÓMINA COMPLETA (todos los empleados, una tirilla por página) */
export function generateNominaCompletaPDF(employees, MESES) {
  return new Promise((resolve, reject) => {
    const W = 255;
    const m = 14;
    const doc = new PDFDocument({ margin: m, size: [W, 900], autoFirstPage: false });
    const chunks = [];
    doc.on("data",  (c) => chunks.push(c));
    doc.on("end",   () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    for (const emp of employees) {
      doc.addPage({ size: [W, 900], margin: m });
      _renderComprobante(doc, emp, MESES);
    }

    doc.end();
  });
}

/* ─── LIQUIDACIÓN LABORAL ──────────────────────────────────────── */
export function generateLiquidacionPDF(data) {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 45, size: "A4", autoFirstPage: true });
    const chunks = [];
    doc.on("data",  (c) => chunks.push(c));
    doc.on("end",   () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W  = doc.page.width;
    const m  = 45;
    const cW = W - m * 2;

    const fmtDate = (d) => {
      if (!d) return "—";
      return new Date(d).toLocaleDateString("es-CO", {
        day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC",
      });
    };

    // ── Encabezado ──
    let y = m;
    try { doc.image(LOGO_PATH, m, y, { height: 55, fit: [120, 55] }); } catch {}
    doc.fontSize(22).fillColor(BLACK).font("Helvetica-Bold")
       .text("LIQUIDACIÓN", m, y + 4, { align: "right", width: cW });
    doc.fontSize(9).fillColor(GRAY).font("Helvetica")
       .text(new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" }),
             m, y + 36, { align: "right", width: cW });
    const lineY = y + 68;
    doc.moveTo(m, lineY).lineTo(W - m, lineY).lineWidth(1.5).strokeColor(GREEN).stroke();
    y = lineY + 16;

    // ── Datos empleado ──
    doc.fontSize(8).fillColor(GREEN).font("Helvetica-Bold").text("DATOS DEL EMPLEADO", m, y); y += 14;
    const empFields = [
      ["Nombre",         data.nombre],
      [data.tipo_identificacion, data.numero_identificacion],
      ["Cargo",          data.cargo],
      ["Tipo contrato",  data.tipo_contrato === "laboral" ? "Contrato laboral" : "Prestación de servicios"],
      ["Fecha ingreso",  fmtDate(data.fecha_ingreso)],
      ["Fecha retiro",   fmtDate(data.fecha_retiro)],
      ["Días trabajados",String(data.dias_trabajados)],
      ["Salario mensual",fmt(data.salario_base)],
    ];
    empFields.forEach(([label, value]) => {
      doc.fontSize(9).fillColor(GRAY).font("Helvetica")
         .text(`${label}:`, m, y, { width: cW * 0.42 });
      doc.fillColor(BLACK).font("Helvetica-Bold")
         .text(value, m + cW * 0.42, y, { width: cW * 0.58 });
      y += 14;
    });

    y += 10;
    doc.moveTo(m, y).lineTo(W - m, y).lineWidth(0.5).strokeColor("#cccccc").stroke();
    y += 14;

    // ── Tabla de conceptos ──
    doc.fontSize(8).fillColor(GREEN).font("Helvetica-Bold")
       .text("CONCEPTOS DE LIQUIDACIÓN", m, y); y += 14;

    // Cabecera
    doc.rect(m, y, cW, 22).fill(BLACK);
    doc.fontSize(8).fillColor(WHITE).font("Helvetica-Bold");
    doc.text("CONCEPTO",  m + 6,         y + 7, { width: cW * 0.38 });
    doc.text("FÓRMULA",   m + cW * 0.38, y + 7, { width: cW * 0.40 });
    doc.text("VALOR",     m + cW * 0.78, y + 7, { width: cW * 0.20, align: "right" });
    y += 22;

    const conceptos = [
      {
        concepto: "Cesantías",
        formula:  `(Sal. × ${data.dias_trabajados} días) ÷ 360`,
        valor:    data.cesantias,
      },
      {
        concepto: "Intereses de Cesantías",
        formula:  `(Cesantías × ${data.dias_trabajados} × 12%) ÷ 360`,
        valor:    data.intereses_cesantias,
      },
      {
        concepto: "Prima de Servicios",
        formula:  `(Sal. × ${data.dias_trabajados} días) ÷ 360`,
        valor:    data.prima,
      },
      {
        concepto: "Vacaciones",
        formula:  `(Sal. × ${data.dias_trabajados} días) ÷ 720`,
        valor:    data.vacaciones,
      },
    ];

    const tableStartY = y;
    conceptos.forEach((row, i) => {
      const rowH = 28;
      doc.rect(m, y, cW, rowH).fill(i % 2 === 0 ? LGRAY : WHITE);
      doc.fontSize(9).fillColor(BLACK).font("Helvetica-Bold")
         .text(row.concepto, m + 6, y + 9, { width: cW * 0.36 });
      doc.fontSize(7.5).fillColor(GRAY).font("Helvetica")
         .text(row.formula, m + cW * 0.38, y + 9, { width: cW * 0.38 });
      doc.fontSize(9.5).fillColor(BLACK).font("Helvetica-Bold")
         .text(fmt(row.valor), m + cW * 0.78, y + 9, { width: cW * 0.20, align: "right" });
      doc.moveTo(m, y + rowH).lineTo(W - m, y + rowH).lineWidth(0.3).strokeColor("#dddddd").stroke();
      y += rowH;
    });
    doc.rect(m, tableStartY, cW, y - tableStartY).lineWidth(0.5).strokeColor("#cccccc").stroke();
    y += 10;

    // Caja total
    const totalBoxW = cW * 0.42;
    const totalBoxX = m + cW - totalBoxW;
    doc.fontSize(10).font("Helvetica-Bold");
    const tbH = doc.currentLineHeight(true) + 18;
    doc.roundedRect(totalBoxX, y, totalBoxW, tbH, 4).fill(GREEN);
    doc.fillColor(WHITE)
       .text("TOTAL LIQUIDACIÓN:", totalBoxX + 8, y + 9, { width: totalBoxW * 0.52, lineBreak: false });
    doc.text(fmt(data.total), totalBoxX, y + 9, { width: totalBoxW - 8, align: "right", lineBreak: false });
    y += tbH + 20;

    // Nota legal
    doc.fontSize(7.5).fillColor(GRAY).font("Helvetica")
       .text(
         "NOTA: Los valores calculados corresponden a los conceptos de ley según el Código Sustantivo del Trabajo " +
         "de Colombia. El empleador debe verificar estos valores con su asesor laboral antes de realizar el pago. " +
         "Este documento es informativo.",
         m, y, { width: cW, align: "justify" }
       );
    y += 38;

    // Firmas
    const sigW = cW * 0.38;
    doc.moveTo(m, y).lineTo(m + sigW, y).lineWidth(0.5).strokeColor("#aaaaaa").stroke();
    doc.moveTo(W - m - sigW, y).lineTo(W - m, y).lineWidth(0.5).strokeColor("#aaaaaa").stroke();
    y += 6;
    doc.fontSize(8).fillColor(GRAY).font("Helvetica")
       .text("Firma empleador", m, y, { width: sigW, align: "center" });
    doc.text("Firma trabajador", W - m - sigW, y, { width: sigW, align: "center" });
    y += 30;

    // Pie
    doc.moveTo(m, y).lineTo(W - m, y).lineWidth(0.5).strokeColor(GREEN).stroke(); y += 8;
    doc.fontSize(7.5).fillColor(GRAY).font("Helvetica")
       .text(
         `${EMPRESA.nombre}  ·  NIT: ${EMPRESA.nit}  ·  ${EMPRESA.tel}  ·  ${EMPRESA.web}`,
         m, y, { align: "center", width: cW }
       );

    doc.end();
  });
}
