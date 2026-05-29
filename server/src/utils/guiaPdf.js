/**
 * Generador de Guía de Despacho en PDF — Natural Ropa Deportiva
 * Formato: A4 Landscape — diseño profesional, sin detalle de productos
 */
import PDFDocument from "pdfkit";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = join(__dirname, "../assets/logo.png");

// ── Paleta ─────────────────────────────────────────────────────────────
const GREEN    = "#22c55e";
const GREEN_LT = "#dcfce7";   // fondo suave
const BLACK    = "#0f172a";
const DARK     = "#1e293b";
const SLATE    = "#334155";
const GRAY     = "#64748b";
const LGRAY    = "#f8fafc";
const BORDER   = "#cbd5e1";
const WHITE    = "#ffffff";
const ACCENT   = "#f0fdf4";

const EMPRESA = {
  nombre:    "Natural Ropa Deportiva",
  nit:       "91156614-3",
  direccion: "Calle 22#17-21",
  ciudad:    "Bucaramanga, Santander",
  telefono:  "+57 315 123 4567",
};

function fmtDate(d) {
  if (!d) return "—";
  const str  = typeof d === "string" ? d : d.toISOString();
  const date = new Date(str.slice(0, 10) + "T12:00:00");
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
}

function totalUnidades(items = []) {
  return (items ?? []).reduce((sum, item) =>
    sum + Object.values(item.sizes || {}).reduce((s, q) => s + (Number(q) || 0), 0), 0
  );
}

// Dibuja un rectángulo con borde redondeado simulado (PDFKit no tiene border-radius)
function roundedRect(doc, x, y, w, h, r, fillColor, strokeColor) {
  doc.save()
    .roundedRect(x, y, w, h, r)
    .fillAndStroke(fillColor, strokeColor ?? fillColor)
    .restore();
}

// Línea divisoria horizontal ligera
function divider(doc, x, y, w, color = BORDER) {
  doc.moveTo(x, y).lineTo(x + w, y).strokeColor(color).lineWidth(0.5).stroke();
}

export function generateGuiaPDF(order, guia = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 0,
      info: { Title: `Guía de Despacho — Pedido ${order.order_number_fmt ?? order.order_number}` },
    });

    const chunks = [];
    doc.on("data",  (c) => chunks.push(c));
    doc.on("end",   () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const PW = 841.89;
    const PH = 595.28;
    const M  = 40;        // margen lateral
    const CW = PW - M * 2;

    // ══════════════════════════════════════════════════════════════════
    // FONDO BASE — casi blanco con separaciones sutiles
    // ══════════════════════════════════════════════════════════════════
    doc.rect(0, 0, PW, PH).fill(LGRAY);

    // ══════════════════════════════════════════════════════════════════
    // BARRA LATERAL IZQUIERDA — acento de marca
    // ══════════════════════════════════════════════════════════════════
    doc.rect(0, 0, 8, PH).fill(GREEN);

    // ══════════════════════════════════════════════════════════════════
    // HEADER — tarjeta blanca superior
    // ══════════════════════════════════════════════════════════════════
    const HDR_H = 82;
    roundedRect(doc, M, 14, CW, HDR_H, 4, WHITE, BORDER);

    // Logo
    try {
      doc.image(LOGO_PATH, M + 16, 24, { height: 50, fit: [120, 50] });
    } catch { /* sin logo */ }

    // Título central
    doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(20)
      .text("GUÍA DE DESPACHO", 0, 38, { width: PW, align: "center" });
    doc.fillColor(GRAY).font("Helvetica").fontSize(8)
      .text("DOCUMENTO DE ENVÍO", 0, 62, { width: PW, align: "center" });

    // Empresa — derecha
    const infoX = PW - M - 220;
    doc.fillColor(BLACK).font("Helvetica-Bold").fontSize(10)
      .text(EMPRESA.nombre, infoX, 24, { width: 212, align: "right" });
    doc.fillColor(GRAY).font("Helvetica").fontSize(7.5)
      .text(`NIT: ${EMPRESA.nit}`,  infoX, 38, { width: 212, align: "right" })
      .text(EMPRESA.direccion,       infoX, 49, { width: 212, align: "right" })
      .text(EMPRESA.ciudad,          infoX, 60, { width: 212, align: "right" })
      .text(EMPRESA.telefono,        infoX, 71, { width: 212, align: "right" });

    let y = 14 + HDR_H + 12;

    // ══════════════════════════════════════════════════════════════════
    // FRANJA DATOS CLAVE — 4 chips en fila
    // ══════════════════════════════════════════════════════════════════
    const CHIP_H = 44;
    const chipW  = (CW - 12) / 4;

    const chips = [
      { label: "PEDIDO",         value: `#${order.order_number_fmt ?? order.order_number}`,      highlight: true  },
      { label: "FECHA",          value: fmtDate(order.created_at),                               highlight: false },
      { label: "TRANSPORTADORA", value: (guia.transportadora || "—").toUpperCase(),              highlight: false },
      { label: "N° GUÍA",        value: guia.numero_guia || "—",                                 highlight: false },
    ];

    chips.forEach((chip, i) => {
      const cx = M + i * (chipW + 4);
      const bg = chip.highlight ? GREEN : WHITE;
      const fg = chip.highlight ? WHITE : SLATE;
      const lc = chip.highlight ? WHITE : GRAY;
      roundedRect(doc, cx, y, chipW, CHIP_H, 4, bg, chip.highlight ? GREEN : BORDER);
      doc.fillColor(lc).font("Helvetica").fontSize(7)
        .text(chip.label, cx + 10, y + 8, { width: chipW - 20 });
      doc.fillColor(fg).font("Helvetica-Bold").fontSize(chip.highlight ? 14 : 10)
        .text(chip.value, cx + 10, y + 20, { width: chipW - 20, ellipsis: true });
    });

    y += CHIP_H + 10;

    // ══════════════════════════════════════════════════════════════════
    // DOS TARJETAS: REMITENTE | DESTINATARIO
    // ══════════════════════════════════════════════════════════════════
    const CARD_H = 120;
    const cardW  = (CW - 12) / 2;

    // ── Remitente
    roundedRect(doc, M, y, cardW, CARD_H, 4, WHITE, BORDER);
    // Badge header
    roundedRect(doc, M + 10, y + 10, 90, 16, 3, GREEN, GREEN);
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(7.5)
      .text("REMITENTE", M + 18, y + 14);

    doc.fillColor(BLACK).font("Helvetica-Bold").fontSize(10)
      .text(EMPRESA.nombre, M + 14, y + 34, { width: cardW - 28 });
    doc.fillColor(GRAY).font("Helvetica").fontSize(8)
      .text(`NIT: ${EMPRESA.nit}`,   M + 14, y + 50)
      .text(EMPRESA.direccion,        M + 14, y + 62)
      .text(EMPRESA.ciudad,           M + 14, y + 74)
      .text(EMPRESA.telefono,         M + 14, y + 86);

    // ── Destinatario
    const dX = M + cardW + 12;
    roundedRect(doc, dX, y, cardW, CARD_H, 4, WHITE, BORDER);
    // Badge header verde oscuro
    roundedRect(doc, dX + 10, y + 10, 100, 16, 3, DARK, DARK);
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(7.5)
      .text("DESTINATARIO", dX + 18, y + 14);

    doc.fillColor(BLACK).font("Helvetica-Bold").fontSize(12)
      .text(order.customer_name ?? "—", dX + 14, y + 34, { width: cardW - 28 });

    const phone  = order.phone   || guia.telefono_destino || "—";
    const ciudad = order.ciudad  || guia.ciudad_destino   || "—";
    const dirDst = guia.direccion_destino || order.address || "—";

    doc.fillColor(SLATE).font("Helvetica").fontSize(8)
      .text(`Tel: ${phone}`, dX + 14, y + 54, { width: cardW - 28 });
    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(8.5)
      .text(ciudad.toUpperCase(), dX + 14, y + 66, { width: cardW - 28 });
    doc.fillColor(SLATE).font("Helvetica").fontSize(8)
      .text(dirDst, dX + 14, y + 80, { width: cardW - 28, ellipsis: true });

    y += CARD_H + 10;

    // ══════════════════════════════════════════════════════════════════
    // FILA INFERIOR: TOTAL UNIDADES · OBSERVACIONES · FIRMA RECEPTOR
    // ══════════════════════════════════════════════════════════════════
    const BOT_H = 80;
    const totalUds = totalUnidades(order.items);

    // Bloque TOTAL UNIDADES — izquierda
    const TUW = 140;
    roundedRect(doc, M, y, TUW, BOT_H, 4, GREEN_LT, GREEN);
    doc.fillColor(GRAY).font("Helvetica-Bold").fontSize(7)
      .text("TOTAL UNIDADES", M + 8, y + 10, { width: TUW - 16, align: "center" });
    doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(30)
      .text(String(totalUds), M + 8, y + 22, { width: TUW - 16, align: "center" });
    doc.fillColor(GRAY).font("Helvetica").fontSize(7)
      .text("prendas", M + 8, y + 54, { width: TUW - 16, align: "center" });

    // Observaciones — centro
    const obsX = M + TUW + 10;
    const sigX = PW - M - 180;
    const obsW = sigX - obsX - 10;
    roundedRect(doc, obsX, y, obsW, BOT_H, 4, WHITE, BORDER);
    doc.fillColor(GRAY).font("Helvetica-Bold").fontSize(7)
      .text("OBSERVACIONES", obsX + 10, y + 10);
    divider(doc, obsX + 10, y + 22, obsW - 20);
    if (guia.observaciones) {
      doc.fillColor(SLATE).font("Helvetica").fontSize(8)
        .text(guia.observaciones, obsX + 10, y + 28, { width: obsW - 20, ellipsis: true });
    }

    // Firma receptor — derecha
    roundedRect(doc, sigX, y, 180, BOT_H, 4, WHITE, BORDER);
    doc.fillColor(GRAY).font("Helvetica-Bold").fontSize(7)
      .text("RECIBIDO POR", sigX + 10, y + 10, { width: 160 });
    divider(doc, sigX + 10, y + 22, 160);

    // Línea de firma
    const sigLineY = y + BOT_H - 26;
    doc.moveTo(sigX + 14, sigLineY).lineTo(sigX + 166, sigLineY)
      .strokeColor(BORDER).lineWidth(0.8).stroke();
    doc.fillColor(GRAY).font("Helvetica").fontSize(6.5)
      .text("Firma y C.C.", sigX + 14, sigLineY + 4);

    // Línea de fecha
    const datLineY = sigLineY - 22;
    doc.moveTo(sigX + 14, datLineY).lineTo(sigX + 166, datLineY)
      .strokeColor(BORDER).lineWidth(0.8).stroke();
    doc.fillColor(GRAY).font("Helvetica").fontSize(6.5)
      .text("Fecha de recibo", sigX + 14, datLineY + 4);

    // ══════════════════════════════════════════════════════════════════
    // FOOTER
    // ══════════════════════════════════════════════════════════════════
    const FTR_Y = PH - 28;
    doc.rect(0, FTR_Y, PW, 28).fill(DARK);
    doc.rect(0, FTR_Y, PW, 2).fill(GREEN);

    doc.fillColor(GRAY).font("Helvetica").fontSize(7)
      .text(
        `${EMPRESA.nombre}  ·  NIT ${EMPRESA.nit}  ·  ${EMPRESA.ciudad}  ·  ${EMPRESA.telefono}  ·  Generado el ${fmtDate(new Date())}`,
        0, FTR_Y + 10,
        { width: PW, align: "center" }
      );

    doc.end();
  });
}
