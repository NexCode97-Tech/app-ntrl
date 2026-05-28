/**
 * Generador de Guía de Despacho en PDF — Natural Ropa Deportiva
 * Formato: A4 Horizontal (Landscape)
 */
import PDFDocument from "pdfkit";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = join(__dirname, "../assets/logo.png");

const GREEN   = "#22c55e";
const GREEN_D = "#16a34a";  // verde oscuro para acentos
const BLACK   = "#111111";
const DARK    = "#1f2937";
const GRAY    = "#6b7280";
const LGRAY   = "#f9fafb";
const MGRAY   = "#f3f4f6";
const BORDER  = "#e5e7eb";
const WHITE   = "#ffffff";
const ACCENT  = "#f0fdf4";  // fondo verde muy suave

const EMPRESA = {
  nombre:    "Natural Ropa Deportiva",
  nit:       "91156614-3",
  direccion: "Calle 22#17-21",
  ciudad:    "Bucaramanga, Santander",
  telefono:  "+57 315 123 4567",
};

function fmtDate(d) {
  if (!d) return "—";
  const str = typeof d === "string" ? d : d.toISOString();
  const date = new Date(str.slice(0, 10) + "T12:00:00");
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
}

/**
 * Genera la guía de despacho en PDF (landscape A4) y retorna un Buffer.
 * @param {Object} order  - Datos del pedido (de getOrderDetail)
 * @param {Object} guia   - transportadora, direccion_destino, observaciones
 */
export function generateGuiaPDF(order, guia = {}) {
  return new Promise((resolve, reject) => {
    // ── Landscape A4: PW = 841.89, PH = 595.28
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 0,
      info: { Title: `Guía de Despacho — ${order.customer_name ?? ""}` },
    });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const PW = 841.89;
    const PH = 595.28;
    const M  = 36;
    const CW = PW - M * 2;

    // ════════════════════════════════════════════════════════════════
    // HEADER — fondo blanco, borde inferior verde
    // ════════════════════════════════════════════════════════════════
    const HDR_H = 88;

    // Fondo blanco header
    doc.rect(0, 0, PW, HDR_H).fill(WHITE);

    // Línea decorativa verde izquierda
    doc.rect(0, 0, 6, HDR_H).fill(GREEN);

    // Logo
    try {
      doc.image(LOGO_PATH, M + 8, 16, { height: 52, fit: [130, 52] });
    } catch { /* sin logo */ }

    // Datos empresa (derecha del header)
    const infoX = PW - M - 230;
    doc.fillColor(BLACK).font("Helvetica-Bold").fontSize(12)
      .text(EMPRESA.nombre, infoX, 18, { width: 230, align: "right" });
    doc.font("Helvetica").fontSize(8).fillColor(GRAY)
      .text(`NIT ${EMPRESA.nit}`, infoX, 36, { width: 230, align: "right" })
      .text(EMPRESA.direccion,    infoX, 47, { width: 230, align: "right" })
      .text(EMPRESA.ciudad,       infoX, 58, { width: 230, align: "right" });

    // Título centrado en el header
    doc.fillColor(GREEN_D).font("Helvetica-Bold").fontSize(18)
      .text("GUÍA DE DESPACHO", 0, 30, { width: PW, align: "center" });

    // Borde inferior header
    doc.rect(0, HDR_H - 3, PW, 3).fill(GREEN);

    let y = HDR_H + 10;

    // ════════════════════════════════════════════════════════════════
    // FRANJA INFO PEDIDO — fondo oscuro con datos clave
    // ════════════════════════════════════════════════════════════════
    const INFO_H = 36;
    doc.rect(0, y, PW, INFO_H).fill(DARK);

    // Número de pedido
    doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(10)
      .text("PEDIDO", M + 8, y + 6);
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(13)
      .text(order.order_number_fmt ?? `#${order.order_number}`, M + 8, y + 18);

    // Fecha
    const col2X = M + 200;
    doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(9)
      .text("FECHA", col2X, y + 6);
    doc.fillColor(WHITE).font("Helvetica").fontSize(10)
      .text(fmtDate(order.created_at), col2X, y + 18);

    // Transportadora
    const col3X = M + 400;
    doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(9)
      .text("TRANSPORTADORA", col3X, y + 6);
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(10)
      .text(guia.transportadora || "—", col3X, y + 18, { width: 200 });

    // Estado
    const col4X = PW - M - 120;
    doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(9)
      .text("ESTADO", col4X, y + 6, { width: 120, align: "right" });
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(10)
      .text((order.status ?? "completado").toUpperCase(), col4X, y + 18, { width: 120, align: "right" });

    y += INFO_H + 12;

    // ════════════════════════════════════════════════════════════════
    // DOS COLUMNAS: REMITENTE | DESTINATARIO
    // ════════════════════════════════════════════════════════════════
    const PARTY_H = 80;
    const colW    = (CW - 14) / 2;

    // ── Remitente
    doc.rect(M, y, colW, PARTY_H).fill(ACCENT).stroke(BORDER);
    // Encabezado remitente
    doc.rect(M, y, colW, 18).fill(GREEN);
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(8)
      .text("▸  REMITENTE", M + 10, y + 5);

    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9)
      .text(EMPRESA.nombre, M + 10, y + 24);
    doc.font("Helvetica").fontSize(8).fillColor(GRAY)
      .text(`NIT: ${EMPRESA.nit}`,  M + 10, y + 37)
      .text(EMPRESA.direccion,       M + 10, y + 49)
      .text(EMPRESA.ciudad,          M + 10, y + 61);

    // ── Destinatario
    const dX = M + colW + 14;
    doc.rect(dX, y, colW, PARTY_H).fill(MGRAY).stroke(BORDER);
    doc.rect(dX, y, colW, 18).fill(DARK);
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(8)
      .text("▸  DESTINATARIO", dX + 10, y + 5);

    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9)
      .text(order.customer_name ?? "—", dX + 10, y + 24, { width: colW - 20 });
    doc.font("Helvetica").fontSize(8).fillColor(GRAY)
      .text(`Tel: ${order.phone ?? "—"}`, dX + 10, y + 37);

    const destDir = guia.direccion_destino || order.address || "—";
    doc.fillColor(BLACK).font("Helvetica").fontSize(8)
      .text(destDir, dX + 10, y + 49, { width: colW - 20, ellipsis: true });

    y += PARTY_H + 14;

    // ════════════════════════════════════════════════════════════════
    // TABLA DE PRODUCTOS
    // ════════════════════════════════════════════════════════════════
    // Etiqueta sección
    doc.rect(M, y, 6, 14).fill(GREEN);
    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(9)
      .text("DETALLE DEL ENVÍO", M + 12, y + 1);
    y += 20;

    // Cabecera tabla
    const TH = 20;
    const cols = [
      { label: "PRODUCTO",    x: M + 8,        w: 210 },
      { label: "REFERENCIA",  x: M + 222,      w: 90  },
      { label: "GÉNERO",      x: M + 316,      w: 70  },
      { label: "TALLAS / CANT.", x: M + 390,   w: 200 },
      { label: "UDS",         x: M + CW - 50,  w: 50, align: "right" },
    ];

    doc.rect(M, y, CW, TH).fill(DARK);
    cols.forEach(({ label, x, w, align }) => {
      doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(7.5)
        .text(label, x, y + 6, { width: w, align: align ?? "left" });
    });
    y += TH;

    // Filas
    const items = order.items ?? [];
    let totalUds = 0;
    items.forEach((item, idx) => {
      const qty = Object.values(item.sizes || {}).reduce((s, q) => s + (Number(q) || 0), 0);
      totalUds += qty;
      const tallas = Object.entries(item.sizes || {})
        .filter(([, q]) => Number(q) > 0)
        .map(([t, q]) => `${t}: ${q}`)
        .join("   ");

      const rowH = 20;
      const bg = idx % 2 === 0 ? WHITE : LGRAY;
      doc.rect(M, y, CW, rowH).fill(bg).stroke(BORDER);

      doc.fillColor(DARK).font("Helvetica").fontSize(8)
        .text(item.product_name ?? "—", cols[0].x, y + 6, { width: cols[0].w, ellipsis: true })
        .text(item.reference ?? "—",    cols[1].x, y + 6, { width: cols[1].w, ellipsis: true })
        .text(item.gender ?? "—",       cols[2].x, y + 6, { width: cols[2].w })
        .text(tallas || "—",            cols[3].x, y + 6, { width: cols[3].w, ellipsis: true });
      doc.font("Helvetica-Bold").fillColor(DARK)
        .text(String(qty), cols[4].x, y + 6, { width: cols[4].w, align: "right" });
      y += rowH;
    });

    // Fila totales
    const TOTAL_H = 22;
    doc.rect(M, y, CW, TOTAL_H).fill(GREEN);
    doc.fillColor(BLACK).font("Helvetica-Bold").fontSize(9)
      .text("TOTAL UNIDADES", M + 8, y + 6)
      .text(String(totalUds), cols[4].x, y + 6, { width: cols[4].w, align: "right" });
    y += TOTAL_H + 10;

    // ════════════════════════════════════════════════════════════════
    // OBSERVACIONES (si hay)
    // ════════════════════════════════════════════════════════════════
    if (guia.observaciones) {
      const obsH = 44;
      doc.rect(M, y, CW, obsH).fill(MGRAY).stroke(BORDER);
      doc.rect(M, y, 4, obsH).fill(GREEN);
      doc.fillColor(GRAY).font("Helvetica-Bold").fontSize(7.5)
        .text("OBSERVACIONES", M + 10, y + 6);
      doc.fillColor(DARK).font("Helvetica").fontSize(8.5)
        .text(guia.observaciones, M + 10, y + 18, { width: CW - 20, ellipsis: true });
      y += obsH + 10;
    }

    // ════════════════════════════════════════════════════════════════
    // FOOTER
    // ════════════════════════════════════════════════════════════════
    const FTR_Y = PH - 28;
    doc.rect(0, FTR_Y, PW, 28).fill(DARK);
    doc.rect(0, FTR_Y, PW, 3).fill(GREEN);

    doc.fillColor(GRAY).font("Helvetica").fontSize(7)
      .text(
        `${EMPRESA.nombre}  ·  NIT ${EMPRESA.nit}  ·  ${EMPRESA.ciudad}  ·  Generado el ${fmtDate(new Date())}`,
        0, FTR_Y + 10,
        { width: PW, align: "center" }
      );

    doc.end();
  });
}
