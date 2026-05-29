/**
 * Generador de Guía de Despacho en PDF — Natural Ropa Deportiva
 * Formato: Carta (Letter) Vertical — 612 x 792 pt
 */
import PDFDocument from "pdfkit";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = join(__dirname, "../assets/logo.png");

// ── Paleta ─────────────────────────────────────────────────────────────
const GREEN    = "#22c55e";
const GREEN_LT = "#dcfce7";
const BLACK    = "#0f172a";
const DARK     = "#1e293b";
const SLATE    = "#334155";
const GRAY     = "#64748b";
const LGRAY    = "#f8fafc";
const BORDER   = "#cbd5e1";
const WHITE    = "#ffffff";

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
  return new Date(str.slice(0, 10) + "T12:00:00")
    .toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
}

function totalUnidades(items = []) {
  return (items ?? []).reduce((sum, item) =>
    sum + Object.values(item.sizes || {}).reduce((s, q) => s + (Number(q) || 0), 0), 0
  );
}

function roundedRect(doc, x, y, w, h, r, fillColor, strokeColor) {
  doc.save()
    .roundedRect(x, y, w, h, r)
    .fillAndStroke(fillColor, strokeColor ?? fillColor)
    .restore();
}

function divider(doc, x, y, w, color = BORDER) {
  doc.moveTo(x, y).lineTo(x + w, y).strokeColor(color).lineWidth(0.6).stroke();
}

export function generateGuiaPDF(order, guia = {}) {
  return new Promise((resolve, reject) => {
    // Carta portrait: 612 x 792 pt
    const PW = 612;
    const PH = 792;
    const M  = 36;
    const CW = PW - M * 2;   // 540

    const doc = new PDFDocument({
      size: "LETTER",
      layout: "portrait",
      margin: 0,
      info: { Title: `Guía de Despacho — Pedido ${order.order_number_fmt ?? order.order_number}` },
    });

    const chunks = [];
    doc.on("data",  (c) => chunks.push(c));
    doc.on("end",   () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Fondo base
    doc.rect(0, 0, PW, PH).fill(LGRAY);

    // ── Barra izquierda de marca
    doc.rect(0, 0, 7, PH).fill(GREEN);

    // ════════════════════════════════════════════════════════════════
    // HEADER
    // ════════════════════════════════════════════════════════════════
    const HDR_H = 100;
    roundedRect(doc, M, 16, CW, HDR_H, 5, WHITE, BORDER);

    // Logo
    try {
      doc.image(LOGO_PATH, M + 18, 28, { height: 64, fit: [100, 64] });
    } catch { /* sin logo */ }

    // Título
    doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(26)
      .text("GUÍA DE DESPACHO", 0, 44, { width: PW, align: "center" });
    doc.fillColor(GRAY).font("Helvetica").fontSize(10)
      .text("DOCUMENTO DE ENVÍO", 0, 76, { width: PW, align: "center" });

    let y = 16 + HDR_H + 14;

    // ════════════════════════════════════════════════════════════════
    // CHIPS — 3 datos clave
    // ════════════════════════════════════════════════════════════════
    const CHIP_H = 58;
    const chips  = [
      { label: "PEDIDO",         value: `#${order.order_number_fmt ?? order.order_number}`, highlight: true  },
      { label: "FECHA",          value: fmtDate(order.created_at),                          highlight: false },
      { label: "TRANSPORTADORA", value: (guia.transportadora || "—").toUpperCase(),         highlight: false },
    ];
    const chipW = (CW - (chips.length - 1) * 5) / chips.length;

    chips.forEach((chip, i) => {
      const cx = M + i * (chipW + 5);
      const bg = chip.highlight ? GREEN : WHITE;
      const fg = chip.highlight ? WHITE : SLATE;
      const lc = chip.highlight ? WHITE : GRAY;
      roundedRect(doc, cx, y, chipW, CHIP_H, 5, bg, chip.highlight ? GREEN : BORDER);
      doc.fillColor(lc).font("Helvetica").fontSize(8.5)
        .text(chip.label, cx + 12, y + 10, { width: chipW - 24 });
      doc.fillColor(fg).font("Helvetica-Bold").fontSize(chip.highlight ? 18 : 12)
        .text(chip.value, cx + 12, y + 26, { width: chipW - 24, ellipsis: true });
    });

    y += CHIP_H + 14;

    // ════════════════════════════════════════════════════════════════
    // REMITENTE | DESTINATARIO
    // ════════════════════════════════════════════════════════════════
    const CARD_H = 152;
    const cardW  = (CW - 12) / 2;

    // ── Remitente
    roundedRect(doc, M, y, cardW, CARD_H, 5, WHITE, BORDER);
    roundedRect(doc, M + 12, y + 12, 110, 22, 4, GREEN, GREEN);
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(9)
      .text("REMITENTE", M + 22, y + 17);

    doc.fillColor(BLACK).font("Helvetica-Bold").fontSize(12)
      .text(EMPRESA.nombre, M + 16, y + 44, { width: cardW - 32 });
    doc.fillColor(GRAY).font("Helvetica").fontSize(10)
      .text(`NIT: ${EMPRESA.nit}`, M + 16, y + 64)
      .text(EMPRESA.direccion,     M + 16, y + 80)
      .text(EMPRESA.ciudad,        M + 16, y + 96)
      .text(EMPRESA.telefono,      M + 16, y + 112);

    // ── Destinatario
    const dX = M + cardW + 12;
    roundedRect(doc, dX, y, cardW, CARD_H, 5, WHITE, BORDER);
    roundedRect(doc, dX + 12, y + 12, 120, 22, 4, DARK, DARK);
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(9)
      .text("DESTINATARIO", dX + 22, y + 17);

    doc.fillColor(BLACK).font("Helvetica-Bold").fontSize(13)
      .text(order.customer_name ?? "—", dX + 16, y + 44, { width: cardW - 32 });

    const phone  = order.phone   || guia.telefono_destino || "—";
    const ciudad = order.ciudad  || guia.ciudad_destino   || "—";
    const dirDst = guia.direccion_destino || order.address || "—";

    doc.fillColor(SLATE).font("Helvetica").fontSize(10)
      .text(`Tel: ${phone}`, dX + 16, y + 68, { width: cardW - 32 });
    doc.fillColor(DARK).font("Helvetica-Bold").fontSize(10.5)
      .text(ciudad.toUpperCase(), dX + 16, y + 86, { width: cardW - 32 });
    doc.fillColor(SLATE).font("Helvetica").fontSize(10)
      .text(dirDst, dX + 16, y + 104, { width: cardW - 32, ellipsis: true });

    y += CARD_H + 14;

    // ════════════════════════════════════════════════════════════════
    // FILA INFERIOR: TOTAL UNIDADES + OBSERVACIONES
    // ════════════════════════════════════════════════════════════════
    const BOT_H    = 110;
    const TUW      = 160;
    const totalUds = totalUnidades(order.items);

    // Total Unidades
    roundedRect(doc, M, y, TUW, BOT_H, 5, GREEN_LT, GREEN);
    doc.fillColor(GRAY).font("Helvetica-Bold").fontSize(8.5)
      .text("TOTAL UNIDADES", M + 8, y + 14, { width: TUW - 16, align: "center" });
    doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(44)
      .text(String(totalUds), M + 8, y + 30, { width: TUW - 16, align: "center" });
    doc.fillColor(GRAY).font("Helvetica").fontSize(9)
      .text("prendas", M + 8, y + 80, { width: TUW - 16, align: "center" });

    // Observaciones
    const obsX = M + TUW + 12;
    const obsW  = CW - TUW - 12;
    roundedRect(doc, obsX, y, obsW, BOT_H, 5, WHITE, BORDER);
    doc.fillColor(GRAY).font("Helvetica-Bold").fontSize(8.5)
      .text("OBSERVACIONES", obsX + 14, y + 14);
    divider(doc, obsX + 14, y + 30, obsW - 28);
    if (guia.observaciones) {
      doc.fillColor(SLATE).font("Helvetica").fontSize(10)
        .text(guia.observaciones, obsX + 14, y + 38, { width: obsW - 28 });
    }

    y += BOT_H + 14;

    // ════════════════════════════════════════════════════════════════
    // FOOTER — fijo al fondo de la página
    // ════════════════════════════════════════════════════════════════
    const FTR_Y = PH - 36;
    doc.rect(0, FTR_Y, PW, 36).fill(DARK);
    doc.rect(0, FTR_Y, PW, 2).fill(GREEN);
    doc.fillColor(GRAY).font("Helvetica").fontSize(8)
      .text(
        `${EMPRESA.nombre}  ·  NIT ${EMPRESA.nit}  ·  ${EMPRESA.ciudad}  ·  Generado el ${fmtDate(new Date())}`,
        0, FTR_Y + 13,
        { width: PW, align: "center" }
      );

    doc.end();
  });
}
