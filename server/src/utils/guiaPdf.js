/**
 * Generador de Guía de Despacho en PDF — Natural Ropa Deportiva
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
const WHITE  = "#ffffff";
const BORDER = "#e4e4e7";

const EMPRESA = {
  nombre:    "Natural Ropa Deportiva",
  nit:       "91156614-3",
  direccion: "Calle 22#17-21",
  ciudad:    "Bucaramanga, Santander",
  telefono:  "+57 315 123 4567",
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
}

function fmtCOP(v) {
  if (!v && v !== 0) return "—";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}

/**
 * Genera la guía de despacho en PDF y retorna un Buffer.
 * @param {Object} order   - Datos del pedido (de getOrderDetail)
 * @param {Object} guia    - Datos editables: transportadora, numero_guia, direccion_destino, observaciones
 */
export function generateGuiaPDF(order, guia = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, info: { Title: `Guía de Despacho #${order.order_number_fmt ?? order.order_number}` } });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const M  = 40;       // margen
    const PW = 595.28;   // ancho A4
    const CW = PW - M * 2;

    // ── HEADER ────────────────────────────────────────────────────
    // Fondo verde superior
    doc.rect(0, 0, PW, 110).fill(BLACK);

    // Logo
    try {
      doc.image(LOGO_PATH, M, 22, { height: 52, fit: [120, 52] });
    } catch { /* sin logo */ }

    // Empresa info (derecha)
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(11)
      .text(EMPRESA.nombre, M + 140, 28, { width: CW - 140, align: "right" });
    doc.font("Helvetica").fontSize(8).fillColor("#a1a1aa")
      .text(`NIT ${EMPRESA.nit}`, M + 140, 44, { width: CW - 140, align: "right" })
      .text(EMPRESA.direccion, M + 140, 54, { width: CW - 140, align: "right" })
      .text(EMPRESA.ciudad, M + 140, 64, { width: CW - 140, align: "right" });

    // Título documento
    doc.rect(0, 110, PW, 36).fill(GREEN);
    doc.fillColor(BLACK).font("Helvetica-Bold").fontSize(14)
      .text("GUÍA DE DESPACHO", 0, 120, { width: PW, align: "center" });

    let y = 160;

    // ── NÚMERO + FECHA ────────────────────────────────────────────
    doc.rect(M, y, CW, 44).fill(LGRAY).stroke(BORDER);
    doc.fillColor(BLACK).font("Helvetica-Bold").fontSize(10)
      .text(`Pedido N° ${order.order_number_fmt ?? order.order_number}`, M + 12, y + 8);
    doc.font("Helvetica").fontSize(9).fillColor(GRAY)
      .text(`Fecha: ${fmtDate(order.created_at)}`, M + 12, y + 24);

    if (guia.numero_guia) {
      doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(11)
        .text(`Guía: ${guia.numero_guia}`, M, y + 8, { width: CW - 12, align: "right" });
    }

    y += 58;

    // ── DOS COLUMNAS: REMITENTE / DESTINATARIO ────────────────────
    const colW = (CW - 12) / 2;

    // Remitente
    doc.rect(M, y, colW, 90).fill(LGRAY).stroke(BORDER);
    doc.fillColor(BLACK).font("Helvetica-Bold").fontSize(9)
      .text("REMITENTE", M + 10, y + 10);
    doc.font("Helvetica").fontSize(9).fillColor(BLACK)
      .text(EMPRESA.nombre,    M + 10, y + 26)
      .text(`NIT: ${EMPRESA.nit}`, M + 10, y + 40)
      .text(EMPRESA.direccion, M + 10, y + 54)
      .text(EMPRESA.ciudad,    M + 10, y + 68);

    // Destinatario
    const dx = M + colW + 12;
    doc.rect(dx, y, colW, 90).fill(LGRAY).stroke(BORDER);
    doc.fillColor(BLACK).font("Helvetica-Bold").fontSize(9)
      .text("DESTINATARIO", dx + 10, y + 10);
    doc.font("Helvetica").fontSize(9).fillColor(BLACK)
      .text(order.customer_name ?? "—",                     dx + 10, y + 26)
      .text(`Tel: ${order.phone ?? "—"}`,                   dx + 10, y + 40)
      .text(guia.direccion_destino || order.address || "—", dx + 10, y + 54, { width: colW - 20 });

    y += 104;

    // ── TRANSPORTADORA ────────────────────────────────────────────
    doc.rect(M, y, CW, 36).fill(WHITE).stroke(BORDER);
    doc.fillColor(GRAY).font("Helvetica").fontSize(8).text("TRANSPORTADORA", M + 10, y + 8);
    doc.fillColor(BLACK).font("Helvetica-Bold").fontSize(10)
      .text(guia.transportadora || "—", M + 10, y + 20);
    y += 50;

    // ── PRODUCTOS ─────────────────────────────────────────────────
    doc.fillColor(BLACK).font("Helvetica-Bold").fontSize(10).text("DETALLE DEL ENVÍO", M, y);
    y += 14;

    // Cabecera tabla
    doc.rect(M, y, CW, 22).fill(BLACK);
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(8)
      .text("PRODUCTO",   M + 8,       y + 7, { width: 200 })
      .text("GÉNERO",     M + 210,     y + 7, { width: 80  })
      .text("TALLAS",     M + 295,     y + 7, { width: 160 })
      .text("TOTAL UDS",  M + CW - 70, y + 7, { width: 65, align: "right" });
    y += 22;

    // Filas de productos
    const items = order.items ?? [];
    let totalUds = 0;
    items.forEach((item, idx) => {
      const qty = Object.values(item.sizes || {}).reduce((s, q) => s + (Number(q) || 0), 0);
      totalUds += qty;
      const tallas = Object.entries(item.sizes || {})
        .filter(([, q]) => Number(q) > 0)
        .map(([t, q]) => `${t}:${q}`)
        .join("  ");

      const rowH = 22;
      const bg = idx % 2 === 0 ? WHITE : LGRAY;
      doc.rect(M, y, CW, rowH).fill(bg).stroke(BORDER);
      doc.fillColor(BLACK).font("Helvetica").fontSize(8)
        .text(item.product_name ?? "—", M + 8,       y + 7, { width: 200, ellipsis: true })
        .text(item.gender ?? "—",       M + 210,     y + 7, { width: 80  })
        .text(tallas || "—",            M + 295,     y + 7, { width: 160, ellipsis: true });
      doc.font("Helvetica-Bold")
        .text(String(qty),              M + CW - 70, y + 7, { width: 65, align: "right" });
      y += rowH;
    });

    // Fila total
    doc.rect(M, y, CW, 24).fill(GREEN).stroke(BORDER);
    doc.fillColor(BLACK).font("Helvetica-Bold").fontSize(9)
      .text("TOTAL UNIDADES", M + 8, y + 7)
      .text(String(totalUds), M + CW - 70, y + 7, { width: 65, align: "right" });
    y += 36;

    // ── OBSERVACIONES ─────────────────────────────────────────────
    if (guia.observaciones) {
      doc.rect(M, y, CW, 58).fill(LGRAY).stroke(BORDER);
      doc.fillColor(GRAY).font("Helvetica").fontSize(8).text("OBSERVACIONES", M + 10, y + 8);
      doc.fillColor(BLACK).font("Helvetica").fontSize(9)
        .text(guia.observaciones, M + 10, y + 22, { width: CW - 20 });
      y += 70;
    }

    // ── FIRMAS ────────────────────────────────────────────────────
    y = Math.max(y, 680);
    const fw = (CW - 24) / 3;
    ["ENTREGADO POR", "RECIBIDO POR", "TRANSPORTADOR"].forEach((label, i) => {
      const fx = M + i * (fw + 12);
      doc.moveTo(fx, y + 38).lineTo(fx + fw, y + 38).stroke(GRAY);
      doc.fillColor(GRAY).font("Helvetica").fontSize(8)
        .text(label, fx, y + 44, { width: fw, align: "center" });
    });

    // ── FOOTER ────────────────────────────────────────────────────
    doc.rect(0, 805, PW, 37).fill(BLACK);
    doc.fillColor(GRAY).font("Helvetica").fontSize(7)
      .text(`${EMPRESA.nombre} · NIT ${EMPRESA.nit} · ${EMPRESA.ciudad}`, 0, 817, { width: PW, align: "center" });
    doc.fillColor("#52525b").fontSize(7)
      .text(`Generado el ${fmtDate(new Date())}`, 0, 828, { width: PW, align: "center" });

    doc.end();
  });
}
