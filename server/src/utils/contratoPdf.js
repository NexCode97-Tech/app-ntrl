/**
 * Generador de Contrato Laboral / Prestación de Servicios en PDF
 * Natural Ropa Deportiva
 */
import PDFDocument from "pdfkit";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = join(__dirname, "../assets/logo.png");

const GREEN  = "#22c55e";
const BLACK  = "#111111";
const GRAY   = "#6b7280";
const LGRAY  = "#f4f4f5";
const BORDER = "#e4e4e7";
const WHITE  = "#ffffff";

const EMPRESA = {
  nombre:         "Natural Ropa Deportiva",
  nit:            "91156614-3",
  representante:  "Representante Legal",
  direccion:      "Calle 22#17-21",
  ciudad:         "Bucaramanga",
  departamento:   "Santander",
};

const MESES = ["enero","febrero","marzo","abril","mayo","junio",
               "julio","agosto","septiembre","octubre","noviembre","diciembre"];

function fmtFecha(d) {
  if (!d) return "___";
  const date = new Date(String(d).slice(0, 10) + "T12:00:00");
  return `${date.getDate()} de ${MESES[date.getMonth()]} de ${date.getFullYear()}`;
}

function fmtCOP(v) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(v ?? 0);
}

function numToLetras(n) {
  // Simplificado para salarios comunes
  const num = Math.round(Number(n) || 0);
  return `${new Intl.NumberFormat("es-CO").format(num)} pesos m/cte`;
}

/**
 * @param {Object} emp   - Datos del empleado
 * @param {Object} extra - Campos adicionales: lugar_trabajo, jornada, duracion, ciudad_contrato, fecha_contrato
 */
export function generateContratoPDF(emp, extra = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, info: { Title: `Contrato — ${emp.nombre}` } });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const M   = 50;
    const PW  = 595.28;
    const PH  = 841.89;
    const CW  = PW - M * 2;
    const esLaboral = emp.tipo_contrato !== "prestacion_servicios";

    // ── HEADER ────────────────────────────────────────────────────
    doc.rect(0, 0, PW, 100).fill(BLACK);
    try { doc.image(LOGO_PATH, M, 18, { height: 52, fit: [110, 52] }); } catch { /* */ }

    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(10)
      .text(EMPRESA.nombre, M + 120, 24, { width: CW - 120, align: "right" });
    doc.font("Helvetica").fontSize(8).fillColor("#a1a1aa")
      .text(`NIT ${EMPRESA.nit}`, M + 120, 38, { width: CW - 120, align: "right" })
      .text(EMPRESA.direccion, M + 120, 49, { width: CW - 120, align: "right" })
      .text(`${EMPRESA.ciudad}, ${EMPRESA.departamento}`, M + 120, 60, { width: CW - 120, align: "right" });

    // Franja verde con título
    doc.rect(0, 100, PW, 32).fill(GREEN);
    const titulo = esLaboral
      ? "CONTRATO DE TRABAJO A TÉRMINO INDEFINIDO"
      : "CONTRATO DE PRESTACIÓN DE SERVICIOS";
    doc.fillColor(BLACK).font("Helvetica-Bold").fontSize(11)
      .text(titulo, 0, 110, { width: PW, align: "center" });

    let y = 148;

    // ── INTRO ─────────────────────────────────────────────────────
    const ciudadContrato = extra.ciudad_contrato || EMPRESA.ciudad;
    const fechaContrato  = extra.fecha_contrato  || new Date().toISOString().slice(0, 10);

    doc.fillColor(BLACK).font("Helvetica").fontSize(9)
      .text(
        `En la ciudad de ${ciudadContrato}, el día ${fmtFecha(fechaContrato)}, entre los suscritos a saber:`,
        M, y, { width: CW }
      );
    y += 22;

    // ── PARTES ────────────────────────────────────────────────────
    function seccion(titulo, items, startY) {
      doc.rect(M, startY, CW, 20).fill(LGRAY).stroke(BORDER);
      doc.fillColor(BLACK).font("Helvetica-Bold").fontSize(9)
        .text(titulo, M + 8, startY + 6);
      let sy = startY + 24;
      items.forEach(([label, value]) => {
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(GRAY)
          .text(label + ":", M + 8, sy, { width: 140, continued: false });
        doc.font("Helvetica").fontSize(8.5).fillColor(BLACK)
          .text(value || "—", M + 152, sy, { width: CW - 152 });
        sy += 15;
      });
      return sy + 6;
    }

    y = seccion("EL EMPLEADOR", [
      ["Razón Social",      EMPRESA.nombre],
      ["NIT",               EMPRESA.nit],
      ["Representante",     EMPRESA.representante],
      ["Dirección",         `${EMPRESA.direccion}, ${EMPRESA.ciudad}`],
    ], y);

    y += 6;

    y = seccion(esLaboral ? "EL TRABAJADOR" : "EL CONTRATISTA", [
      ["Nombre completo",   emp.nombre],
      ["Tipo de documento", emp.tipo_identificacion || "CC"],
      ["Número de ID",      emp.numero_identificacion],
      ["Cargo / Servicio",  emp.cargo],
    ], y);

    y += 10;

    // ── CLÁUSULAS ─────────────────────────────────────────────────
    function clausula(num, titulo, texto, startY) {
      // Título cláusula
      doc.rect(M, startY, CW, 18).fill(BLACK);
      doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(8.5)
        .text(`CLÁUSULA ${num} — ${titulo.toUpperCase()}`, M + 8, startY + 5);
      startY += 22;
      doc.fillColor(BLACK).font("Helvetica").fontSize(8.5)
        .text(texto, M + 8, startY, { width: CW - 16, align: "justify" });
      const textH = doc.heightOfString(texto, { width: CW - 16 });
      return startY + textH + 10;
    }

    if (esLaboral) {
      const jornada  = extra.jornada  || "lunes a sábado de 7:00 a.m. a 5:00 p.m.";
      const lugar    = extra.lugar_trabajo || `${EMPRESA.direccion}, ${EMPRESA.ciudad}`;

      y = clausula(1, "Objeto",
        `El EMPLEADOR contrata los servicios personales del TRABAJADOR para desempeñar el cargo de ${emp.cargo}, realizando todas las funciones inherentes a dicho cargo y las demás que le sean asignadas por su empleador, de acuerdo con la naturaleza del trabajo contratado.`,
        y);

      y = clausula(2, "Duración",
        `El presente contrato es a TÉRMINO INDEFINIDO y comenzará a regir a partir del ${fmtFecha(emp.fecha_ingreso)}. Cualquiera de las partes podrá darlo por terminado previo aviso con antelación no inferior a treinta (30) días calendario.`,
        y);

      y = clausula(3, "Salario",
        `El EMPLEADOR pagará al TRABAJADOR un salario mensual de ${fmtCOP(emp.salario_base)} (${numToLetras(emp.salario_base)}), pagadero en quincenas vencidas. Este salario incluye la remuneración de todos los servicios ordinarios prestados durante la jornada de trabajo.`,
        y);

      y = clausula(4, "Jornada de Trabajo",
        `El TRABAJADOR prestará sus servicios en la jornada de trabajo ordinaria de ${jornada}, para un total de cuarenta y dos (42) horas semanales. El TRABAJADOR se obliga a laborar horas extras cuando las necesidades del servicio así lo requieran.`,
        y);

      y = clausula(5, "Lugar de Trabajo",
        `El TRABAJADOR prestará sus servicios en ${lugar}, sin perjuicio de que el EMPLEADOR, por necesidades del servicio, pueda trasladarlo a otro lugar dentro del territorio nacional, previo cumplimiento de los requisitos legales.`,
        y);

      y = clausula(6, "Obligaciones del Trabajador",
        `El TRABAJADOR se obliga a: (a) Ejecutar el trabajo con la intensidad, cuidado y esmero apropiados; (b) Guardar absoluta reserva sobre los negocios de la empresa; (c) Observar las medidas preventivas de seguridad industrial; (d) Acatar las instrucciones del empleador; (e) No comunicar a terceros la información confidencial de la empresa.`,
        y);

      y = clausula(7, "Prestaciones Sociales",
        `El TRABAJADOR tendrá derecho a las prestaciones sociales de ley: prima de servicios, cesantías, intereses sobre cesantías, vacaciones remuneradas, y las demás establecidas en el Código Sustantivo del Trabajo y normas concordantes.`,
        y);

    } else {
      const duracion = extra.duracion || "seis (6) meses";
      const lugar    = extra.lugar_trabajo || `${EMPRESA.ciudad}, ${EMPRESA.departamento}`;

      y = clausula(1, "Objeto",
        `El CONTRATISTA se obliga para con el CONTRATANTE a prestar de manera independiente y autónoma los servicios de ${emp.cargo}, de acuerdo con sus conocimientos y experiencia, sin que exista subordinación laboral de ninguna clase.`,
        y);

      y = clausula(2, "Duración",
        `El presente contrato tendrá una duración de ${duracion}, contados a partir del ${fmtFecha(emp.fecha_ingreso)}, prorrogable por mutuo acuerdo entre las partes.`,
        y);

      y = clausula(3, "Honorarios",
        `El CONTRATANTE pagará al CONTRATISTA por sus servicios la suma de ${fmtCOP(emp.salario_base)} (${numToLetras(emp.salario_base)}) mensuales, pagaderos en quincenas vencidas. El CONTRATISTA asume la responsabilidad del pago de sus obligaciones de seguridad social como trabajador independiente.`,
        y);

      y = clausula(4, "Autonomía e Independencia",
        `El CONTRATISTA ejecutará el objeto del contrato con total autonomía e independencia técnica y administrativa. No existirá relación laboral entre las partes. El CONTRATISTA no tendrá derecho a prestaciones sociales propias del contrato de trabajo.`,
        y);

      y = clausula(5, "Lugar de Ejecución",
        `El presente contrato se ejecutará principalmente en ${lugar}, sin que esto implique exclusividad de lugar, pudiendo el CONTRATISTA prestar los servicios desde donde considere pertinente para el cumplimiento del objeto contratado.`,
        y);

      y = clausula(6, "Obligaciones del Contratista",
        `El CONTRATISTA se obliga a: (a) Ejecutar el objeto contractual con diligencia y eficiencia; (b) Guardar absoluta confidencialidad sobre la información de la empresa; (c) Cumplir con sus obligaciones tributarias y de seguridad social como independiente; (d) Reportar el avance de sus actividades cuando le sea requerido.`,
        y);
    }

    // ── FIRMAS ────────────────────────────────────────────────────
    // Asegurar que quepan en la misma página o pasar a nueva
    if (y > PH - 160) {
      doc.addPage();
      y = 50;
    }

    y += 10;
    doc.fillColor(BLACK).font("Helvetica").fontSize(9)
      .text(
        `Para constancia se firma en ${ciudadContrato}, el ${fmtFecha(fechaContrato)}.`,
        M, y, { width: CW }
      );
    y += 30;

    const fw = (CW - 24) / 2;

    // Firma empleador
    doc.moveTo(M, y + 40).lineTo(M + fw, y + 40).stroke(GRAY);
    doc.fillColor(BLACK).font("Helvetica-Bold").fontSize(8.5)
      .text(EMPRESA.nombre, M, y + 46, { width: fw, align: "center" });
    doc.font("Helvetica").fontSize(8).fillColor(GRAY)
      .text(`NIT: ${EMPRESA.nit}`, M, y + 58, { width: fw, align: "center" })
      .text("EL EMPLEADOR / CONTRATANTE", M, y + 70, { width: fw, align: "center" });

    // Firma empleado
    const fx2 = M + fw + 24;
    doc.moveTo(fx2, y + 40).lineTo(fx2 + fw, y + 40).stroke(GRAY);
    doc.fillColor(BLACK).font("Helvetica-Bold").fontSize(8.5)
      .text(emp.nombre, fx2, y + 46, { width: fw, align: "center" });
    doc.font("Helvetica").fontSize(8).fillColor(GRAY)
      .text(`${emp.tipo_identificacion || "CC"}: ${emp.numero_identificacion}`, fx2, y + 58, { width: fw, align: "center" })
      .text(esLaboral ? "EL TRABAJADOR" : "EL CONTRATISTA", fx2, y + 70, { width: fw, align: "center" });

    // ── FOOTER ────────────────────────────────────────────────────
    doc.rect(0, PH - 32, PW, 32).fill(BLACK);
    doc.fillColor(GRAY).font("Helvetica").fontSize(7)
      .text(`${EMPRESA.nombre} · NIT ${EMPRESA.nit} · ${EMPRESA.ciudad}, ${EMPRESA.departamento}`, 0, PH - 22, { width: PW, align: "center" });

    doc.end();
  });
}
