import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE } from "../../config/api.js";
import { useAuthStore } from "../../stores/authStore.js";
import CascadeFilter from "../../components/orders/CascadeFilter.jsx";
import SizeQuantityGrid from "../../components/orders/SizeQuantityGrid.jsx";
import { fileUrl } from "../../utils/fileUrl.js";
import DownloadIcon from "../../components/ui/DownloadIcon.jsx";
const IconBack     = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const IconEdit     = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>;
const IconInvoice  = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
const IconTrash    = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const IconCheck    = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconTruck    = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
const IconDocument = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IconCalendar = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconUser     = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function PdfThumbnail({ url, label, onClick, width = 96, btnClassName = "" }) {
  const [error, setError] = useState(false);
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick}
      style={{ width, height: width }}
      className={`relative overflow-hidden bg-white flex-shrink-0 ${btnClassName}`}>
      {!error ? (
        <Document file={url} onLoadError={() => setError(true)} loading={null}>
          <Page pageNumber={1} width={width} renderAnnotationLayer={false} renderTextLayer={false} />
        </Document>
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full gap-1 text-zinc-200">
          <IconDocument />
          {label && <span className="text-[9px] truncate w-full text-center px-1">{label}</span>}
        </div>
      )}
      {label && width >= 64 && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center truncate px-1 py-0.5">
          {label}
        </div>
      )}
    </Tag>
  );
}

const AREA_NAMES = {
  corte: "Corte", diseno_disenar: "Diseño",
  impresion: "Impresión", sublimacion: "Sublimación",
  ensamble: "Ensamble", terminados: "Terminados",
};

const STATUS_LABELS = {
  pending:     { label: "Pendiente",  cls: "badge-pending" },
  in_progress: { label: "En proceso", cls: "badge-progress" },
  done:        { label: "Listo",      cls: "badge-completed" },
  completed:   { label: "Completado", cls: "badge-completed" },
  delivered:   { label: "Entregado",  cls: "badge-delivered" },
};

const GENDERS = [
  { value: "nino",   label: "Niño" },
  { value: "hombre", label: "Hombre" },
  { value: "mujer",  label: "Mujer" },
  { value: "unisex", label: "Unisex" },
];

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { accessToken } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [tab,        setTab]        = useState(searchParams.get("tab") || "items");
  const [showEdit,   setShowEdit]   = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [pdfSrc,     setPdfSrc]     = useState(null);
  const [showGuia,   setShowGuia]   = useState(false);
  const [guiaForm,   setGuiaForm]   = useState({ transportadora: "", direccion_destino: "", observaciones: "", punto_cucuta: false, punto_bucaramanga: false });
  const [guiaLoading, setGuiaLoading] = useState(false);

  async function handleDownloadGuia() {
    setGuiaLoading(true);
    try {
      const res = await api.post(`/orders/${id}/guia`, guiaForm, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = `Guia-Despacho-${data?.order_number_fmt || id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setShowGuia(false);
    } catch { alert("Error al generar la guía."); }
    finally { setGuiaLoading(false); }
  }

  async function handleDownloadInvoice() {
    try {
      const res = await api.get(`/orders/${id}/invoice`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement("a");
      a.href     = url;
      const safeName = (data?.customer_name || "cliente")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
      a.download = `Factura_${data?.order_number_fmt || id}_${safeName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignorar */ }
  }

  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn:  () => api.get(`/orders/${id}`).then((r) => r.data.data),
    refetchInterval: 30000,
  });

  async function markDelivered() {
    if (!confirm("¿Marcar como entregado?")) return;
    await api.put(`/orders/${id}`, { status: "delivered" });
    qc.invalidateQueries({ queryKey: ["order", id] });
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["production-overview"] });
    qc.invalidateQueries({ queryKey: ["upcoming-deliveries"] });
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar el pedido #${data?.order_number}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/orders/${id}`);
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["production-overview"] });
      qc.invalidateQueries({ queryKey: ["upcoming-deliveries"] });
      navigate("/orders");
    } catch (err) {
      alert(err.response?.data?.message || "Error al eliminar el pedido.");
    }
  }

  if (isLoading) return <div className="text-zinc-500 text-center py-12">Cargando pedido...</div>;
  if (!data)     return <div className="text-zinc-500 text-center py-12">Pedido no encontrado.</div>;

  const s          = STATUS_LABELS[data.status] || STATUS_LABELS.pending;
  const designFiles = parseDesignFiles(data.design_file);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="card overflow-hidden p-0">
        {/* Banda superior con gradiente */}
        <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 px-4 pt-4 pb-5">
          {/* Volver */}
          <button onClick={() => navigate("/orders")}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white mb-4 transition-colors">
            <IconBack /> Volver a pedidos
          </button>

          {/* Avatar + info principal */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-green/20 border border-brand-green/30 flex items-center justify-center shrink-0">
              <span className="text-brand-green font-black text-lg">
                {data.customer_name?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              {/* Número + estado */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-brand-green font-mono font-bold text-xl">#{data.order_number}</span>
                <span className={s.cls}>{s.label}</span>
              </div>
              {/* Nombre del pedido (si existe) */}
              {data.name && <p className="text-zinc-400 text-xs mt-0.5 truncate">{data.name}</p>}
              {/* Cliente — protagonista */}
              <p className="text-white font-semibold text-base mt-1 truncate">{data.customer_name}</p>
            </div>
          </div>

          {/* Metadata chips — fecha y vendedor en fila separada */}
          {(data.delivery_date || data.created_by_name) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {data.delivery_date && (
                <div className="flex items-center gap-2 bg-zinc-800/80 border border-zinc-700 rounded-xl px-3 py-2">
                  <span className="text-zinc-400"><IconCalendar /></span>
                  <span className="text-zinc-500 text-xs">Entrega</span>
                  <span className="text-white text-xs font-semibold">
                    {new Date(data.delivery_date).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
              )}
              {data.created_by_name && (
                <div className="flex items-center gap-2 bg-zinc-800/80 border border-zinc-700 rounded-xl px-3 py-2">
                  <span className="text-zinc-400"><IconUser /></span>
                  <span className="text-zinc-500 text-xs">Vendedor</span>
                  <span className="text-white text-xs font-semibold">{data.created_by_name}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Acciones — siempre en una sola fila */}
        <div className="px-4 py-3 flex items-center gap-2 border-t border-zinc-800">
          {data.status !== "delivered" && (
            <button onClick={() => setShowEdit(true)}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm btn-secondary">
              <IconEdit /> Editar
            </button>
          )}
          {data.status !== "delivered" && data.status === "completed" && (
            <button onClick={markDelivered}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm btn-primary">
              <IconCheck /> Entregado
            </button>
          )}
          {["completed", "delivered"].includes(data.status) && (
            <button onClick={() => {
                setGuiaForm({
                  transportadora:    data.guia_data?.transportadora    ?? "",
                  direccion_destino: data.guia_data?.direccion_destino ?? data.address ?? "",
                  punto_cucuta:      data.guia_data?.punto_cucuta      ?? false,
                  punto_bucaramanga: data.guia_data?.punto_bucaramanga ?? false,
                  observaciones:     data.guia_data?.observaciones     ?? "",
                });
                setShowGuia(true);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm btn-secondary">
              <IconTruck /> Guía despacho
            </button>
          )}
          <button onClick={handleDownloadInvoice}
            className="flex-1 flex items-center justify-center gap-1.5 text-sm btn-secondary">
            <IconInvoice /> Factura
          </button>
          <button onClick={handleDelete}
            className="flex-1 flex items-center justify-center gap-1.5 text-sm px-3 py-2 font-medium rounded-lg text-red-400 hover:text-white hover:bg-red-900 border border-red-800 transition-colors">
            <IconTrash /> Eliminar
          </button>
        </div>

        {/* Diseños adjuntos */}
        {designFiles.length > 0 && (
          <div className="px-4 pb-4 border-t border-zinc-800 pt-3">
            <p className="text-xs text-zinc-500 mb-3">
              Diseño{designFiles.length > 1 ? "s" : ""} adjunto{designFiles.length > 1 ? "s" : ""}
            </p>
            <div className="flex gap-3 flex-wrap">
              {designFiles.map((f, i) => {
                const url    = fileUrl(f.url);
                const rawUrl = f.url ?? "";
                const pdf    = rawUrl.toLowerCase().endsWith(".pdf") || rawUrl.includes("/raw/upload/");
                const label  = f.name ? f.name.replace(/\.[^.]+$/, "") : (designFiles.length > 1 ? `Archivo ${i + 1}` : "Archivo");
                return (
                  <button key={i} type="button"
                    onClick={() => pdf ? setPdfSrc(url) : setLightboxSrc(url)}
                    className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 relative border border-zinc-700 hover:border-brand-green transition-colors focus:outline-none">
                    {pdf ? (
                      <>
                        <div className="w-full h-full bg-white overflow-hidden flex items-start justify-center">
                          <Document file={url} loading={null} onLoadError={() => {}}>
                            <Page pageNumber={1} width={96} renderAnnotationLayer={false} renderTextLayer={false} />
                          </Document>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center truncate px-1 py-0.5">{label}</div>
                      </>
                    ) : (
                      <img src={url} alt={label} className="w-full h-full object-cover" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal guía de despacho */}
      <AnimatePresence>
        {showGuia && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ backgroundColor: "rgba(0,0,0,0)" }}
            animate={{ backgroundColor: "rgba(0,0,0,0.82)" }}
            exit={{ backgroundColor: "rgba(0,0,0,0)" }}
            transition={{ duration: 0.28 }}
            onClick={() => setShowGuia(false)}
          >
            <motion.div
              className="bg-zinc-900 w-full sm:max-w-md overflow-hidden shadow-2xl rounded-t-3xl sm:rounded-2xl border border-zinc-800/60"
              initial={{ opacity: 0, y: 80, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.96 }}
              transition={{ duration: 0.38, ease: [0.23, 1, 0.32, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle — solo mobile */}
              <div className="flex justify-center pt-3 sm:hidden">
                <div className="w-9 h-1 rounded-full bg-zinc-700" />
              </div>

              {/* ── Header ─────────────────────────────────── */}
              <div className="relative px-5 pt-4 pb-5">
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-800/60 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-br from-brand-green/5 to-transparent pointer-events-none" />

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Ícono con glow */}
                    <div className="relative">
                      <div className="absolute inset-0 rounded-xl bg-brand-green/20 blur-md" />
                      <div className="relative w-10 h-10 rounded-xl bg-zinc-800 border border-brand-green/30 flex items-center justify-center text-brand-green">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-white font-bold text-[15px] leading-tight">Guía de Despacho</h2>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-zinc-500 text-xs">Pedido</span>
                        <span className="font-mono text-brand-green text-xs font-bold">#{data?.order_number_fmt}</span>
                      </div>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setShowGuia(false)}
                    whileTap={{ scale: 0.92 }}
                    transition={{ duration: 0.1 }}
                    className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </motion.button>
                </div>

                {/* Separador con gradiente */}
                <div className="relative mt-4 h-px">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-700/80 to-transparent" />
                </div>
              </div>

              {/* ── Cuerpo ─────────────────────────────────── */}
              <div className="px-5 pb-6 space-y-5">

                {/* Sección: Destino especial */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.07, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                >
                  <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-widest mb-2.5">
                    Destino especial
                  </p>
                  <div className="space-y-2">

                    {/* ── Toggle Cúcuta ── */}
                    <div className={`rounded-xl border overflow-hidden transition-colors duration-250
                      ${guiaForm.punto_cucuta ? "border-brand-green/60 bg-brand-green/5" : "border-zinc-800 bg-zinc-800/30"}`}>
                      <button
                        type="button"
                        onClick={() => setGuiaForm((p) => ({ ...p, punto_cucuta: !p.punto_cucuta, punto_bucaramanga: false }))}
                        className="w-full flex items-center gap-3.5 px-4 py-3 cursor-pointer text-left"
                      >
                        <div className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center transition-all duration-250
                          ${guiaForm.punto_cucuta ? "bg-brand-green text-black shadow-[0_0_12px_rgba(34,197,94,0.4)]" : "bg-zinc-700/80 text-zinc-400"}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold leading-tight transition-colors duration-200
                            ${guiaForm.punto_cucuta ? "text-brand-green" : "text-zinc-200"}`}>
                            Punto de Venta Cúcuta
                          </p>
                          <p className="text-zinc-500 text-xs mt-0.5">M. Teran · Av 0#19-53 L3</p>
                        </div>
                        {/* Switch */}
                        <div className={`w-11 h-6 rounded-full shrink-0 relative transition-colors duration-300
                          ${guiaForm.punto_cucuta ? "bg-brand-green" : "bg-zinc-700"}`}>
                          <motion.span
                            className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md"
                            animate={{ left: guiaForm.punto_cucuta ? "calc(100% - 20px)" : "4px" }}
                            transition={{ type: "spring", stiffness: 500, damping: 35 }}
                          />
                        </div>
                      </button>

                      {/* Expansión de detalles — Cúcuta */}
                      <AnimatePresence>
                        {guiaForm.punto_cucuta && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
                            style={{ overflow: "hidden" }}
                          >
                            <div className="mx-4 mb-3 px-3 py-2.5 rounded-lg bg-zinc-900/70 border border-brand-green/20">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-green shrink-0"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                  <span className="text-zinc-300 text-xs">Avenida 0#19-53 Local 3, Barrio Blanco · Cúcuta</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-green shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.93 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 5.61 5.61l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                  <span className="text-zinc-300 text-xs">+57 322 279 5244 · C.C. 1153483</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* ── Toggle Bucaramanga ── */}
                    <div className={`rounded-xl border overflow-hidden transition-colors duration-250
                      ${guiaForm.punto_bucaramanga ? "border-blue-500/60 bg-blue-500/5" : "border-zinc-800 bg-zinc-800/30"}`}>
                      <button
                        type="button"
                        onClick={() => setGuiaForm((p) => ({ ...p, punto_bucaramanga: !p.punto_bucaramanga, punto_cucuta: false }))}
                        className="w-full flex items-center gap-3.5 px-4 py-3 cursor-pointer text-left"
                      >
                        <div className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center transition-all duration-250
                          ${guiaForm.punto_bucaramanga ? "bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]" : "bg-zinc-700/80 text-zinc-400"}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold leading-tight transition-colors duration-200
                            ${guiaForm.punto_bucaramanga ? "text-blue-400" : "text-zinc-200"}`}>
                            Almacén Bucaramanga
                          </p>
                          <p className="text-zinc-500 text-xs mt-0.5">Cúcuta → BGA · Natural Ropa Deportiva</p>
                        </div>
                        {/* Switch */}
                        <div className={`w-11 h-6 rounded-full shrink-0 relative transition-colors duration-300
                          ${guiaForm.punto_bucaramanga ? "bg-blue-500" : "bg-zinc-700"}`}>
                          <motion.span
                            className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md"
                            animate={{ left: guiaForm.punto_bucaramanga ? "calc(100% - 20px)" : "4px" }}
                            transition={{ type: "spring", stiffness: 500, damping: 35 }}
                          />
                        </div>
                      </button>

                      {/* Expansión de detalles — Bucaramanga */}
                      <AnimatePresence>
                        {guiaForm.punto_bucaramanga && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
                            style={{ overflow: "hidden" }}
                          >
                            <div className="mx-4 mb-3 px-3 py-2.5 rounded-lg bg-zinc-900/70 border border-blue-500/20">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 shrink-0"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                  <span className="text-zinc-300 text-xs">Calle 22#17-21 · Bucaramanga, Santander</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.93 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 5.61 5.61l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                  <span className="text-zinc-300 text-xs">+57 315 123 4567 · NIT 91156614-3</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                  </div>
                </motion.div>

                {/* Sección: Envío */}
                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.13, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                >
                  <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-widest">
                    Detalles del envío
                  </p>

                  {/* Transportadora */}
                  <div>
                    <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Transportadora</label>
                    <input
                      className="input-field w-full"
                      placeholder="Ej: Servientrega, Coordinadora, Envia..."
                      value={guiaForm.transportadora}
                      onChange={(e) => setGuiaForm((p) => ({ ...p, transportadora: e.target.value }))}
                    />
                  </div>

                  {/* Dirección destino — solo si no es ningún punto especial */}
                  <AnimatePresence>
                    {!guiaForm.punto_cucuta && !guiaForm.punto_bucaramanga && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                        style={{ overflow: "hidden" }}
                      >
                        <div className="pt-0.5">
                          <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Dirección de destino</label>
                          <input
                            className="input-field w-full"
                            placeholder="Calle, ciudad, departamento"
                            value={guiaForm.direccion_destino}
                            onChange={(e) => setGuiaForm((p) => ({ ...p, direccion_destino: e.target.value }))}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Observaciones */}
                  <div>
                    <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Observaciones</label>
                    <textarea
                      className="input-field w-full resize-none"
                      rows={3}
                      placeholder="Indicaciones especiales para el transportador..."
                      value={guiaForm.observaciones}
                      onChange={(e) => setGuiaForm((p) => ({ ...p, observaciones: e.target.value }))}
                    />
                  </div>
                </motion.div>

                {/* Separador */}
                <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

                {/* Acciones */}
                <motion.div
                  className="flex gap-3"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
                >
                  <motion.button
                    onClick={() => setShowGuia(false)}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.1 }}
                    className="flex-1 btn-secondary cursor-pointer"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    onClick={handleDownloadGuia}
                    disabled={guiaLoading}
                    whileTap={{ scale: guiaLoading ? 1 : 0.97 }}
                    transition={{ duration: 0.1 }}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer relative overflow-hidden"
                  >
                    {/* Shimmer en hover */}
                    {!guiaLoading && (
                      <motion.span
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"
                        whileHover={{ translateX: "200%" }}
                        transition={{ duration: 0.6, ease: "linear" }}
                      />
                    )}
                    {guiaLoading ? (
                      <>
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }}
                          className="inline-block"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        </motion.span>
                        Generando...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Descargar PDF
                      </>
                    )}
                  </motion.button>
                </motion.div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {lightboxSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightboxSrc(null)}>
          <button className="absolute top-4 right-4 text-white text-3xl leading-none hover:text-zinc-300"
            onClick={() => setLightboxSrc(null)}>✕</button>
          <img src={lightboxSrc} alt="Diseño del pedido"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {pdfSrc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
            <span className="text-white text-sm font-medium">Vista previa PDF</span>
            <div className="flex items-center gap-3">
              <a href={pdfSrc} download className="text-zinc-400 hover:text-white text-sm flex items-center gap-1"><DownloadIcon /> Descargar</a>
              <button onClick={() => setPdfSrc(null)} className="text-white text-2xl leading-none hover:text-zinc-300">✕</button>
            </div>
          </div>
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(pdfSrc)}&embedded=true`}
            className="flex-1 w-full border-0"
            title="Vista previa PDF"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg overflow-x-auto scrollbar-none">
        {[["items","Productos"],["financial","Abonos"],["production","Producción"],["notes","Observaciones"],["history","Historial"]].map(([key, label]) => (
          <button key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap shrink-0
              ${tab === key ? "bg-brand-green text-black" : "text-zinc-400 hover:text-white"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Productos */}
      {tab === "items" && (
        <div className="card space-y-3">
          {data.items?.map((item) => {
            const df = item.design_file_index != null ? designFiles[item.design_file_index] : null;
            const dfUrl = df ? fileUrl(df.url ?? df) : null;
            const dfIsPdf = df ? (String(df.url ?? df).toLowerCase().endsWith(".pdf") || String(df.url ?? df).includes("/raw/upload/")) : false;
            const itemQty = Object.values(item.sizes).reduce((s, q) => s + (Number(q) || 0), 0);
            const itemSubtotal = itemQty * (Number(item.unit_price) || 0);
            return (
              <div key={item.id} className="bg-zinc-800 rounded-lg p-3">
                {/* Fila superior: miniatura + nombre + tallas a la derecha */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  {/* Izquierda: imagen + nombre + meta */}
                  <div className="flex items-start gap-2 min-w-0">
                    {df && (
                      dfIsPdf ? (
                        <PdfThumbnail url={dfUrl} width={32} btnClassName="rounded border border-zinc-600 shrink-0" onClick={() => setPdfSrc(dfUrl)} />
                      ) : (
                        <button type="button" onClick={() => setLightboxSrc(dfUrl)} className="shrink-0 focus:outline-none">
                          <img src={dfUrl} alt="diseño" className="w-8 h-8 rounded object-cover border border-zinc-600 hover:border-brand-green transition-colors cursor-zoom-in" />
                        </button>
                      )
                    )}
                    <div className="min-w-0">
                      <p className="text-white font-medium leading-tight">{item.product_name}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {[item.sport_name, item.line_name, item.gender].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                  {/* Derecha: tallas */}
                  <div className="flex gap-1.5 flex-wrap justify-end shrink-0 max-w-[45%]">
                    {Object.entries(item.sizes).filter(([,q]) => q > 0).map(([size, qty]) => (
                      <span key={size} className="bg-zinc-700 text-white text-xs px-2 py-0.5 rounded">
                        {size}: {qty}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Fila inferior: unidades + subtotal */}
                <div className="flex items-center justify-end gap-3 text-xs text-zinc-400 pt-1 border-t border-zinc-700/60">
                  <span>{itemQty} und.</span>
                  {itemSubtotal > 0 && (
                    <span className="text-white font-medium">${itemSubtotal.toLocaleString("es-CO")}</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Total general */}
          {data.items?.length > 0 && (() => {
            const totalQty = data.items.reduce((s, item) =>
              s + Object.values(item.sizes).reduce((a, q) => a + (Number(q) || 0), 0), 0);
            const totalPesos = data.items.reduce((s, item) => {
              const qty = Object.values(item.sizes).reduce((a, q) => a + (Number(q) || 0), 0);
              return s + qty * (Number(item.unit_price) || 0);
            }, 0);
            return (
              <div className="border-t border-zinc-700 pt-3 space-y-1 px-1">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">Total unidades</span>
                  <span className="text-white font-bold text-lg">{totalQty}</span>
                </div>
                {totalPesos > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">Total pedido</span>
                    <span className="text-brand-green font-bold text-lg">${totalPesos.toLocaleString("es-CO")}</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab: Financiero */}
      {tab === "financial" && (
        <FinancialTab order={data} onRefresh={() => {
          qc.invalidateQueries({ queryKey: ["order", id] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
        }} onPreviewImage={setLightboxSrc} onPreviewPdf={setPdfSrc} />
      )}

      {/* Tab: Producción */}
      {tab === "production" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.tasks?.map((task) => {
              const ts = STATUS_LABELS[task.status] || STATUS_LABELS.pending;
              return (
                <div key={task.id} className="card flex flex-col gap-2">
                  <p className="text-white font-semibold text-sm leading-tight">{AREA_NAMES[task.area]}</p>
                  <span className={`${ts.cls} w-fit`}>{ts.label}</span>
                  {(task.started_by_name || task.completed_by_name) && (
                    <div className="space-y-0.5 mt-auto pt-1 border-t border-zinc-800">
                      {task.started_by_name && (
                        <p className="text-[11px] text-zinc-500 truncate">▶ {task.started_by_name}</p>
                      )}
                      {task.completed_by_name && (
                        <p className="text-[11px] text-zinc-500 truncate">✓ {task.completed_by_name}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <ProgressMatrix orderId={id} items={data.items || []} />
        </div>
      )}

      {/* Tab: Observaciones */}
      {tab === "notes" && (
        <div className="card">
          {data.description ? (
            <p className="text-zinc-200 whitespace-pre-wrap text-sm leading-relaxed">{data.description}</p>
          ) : (
            <p className="text-zinc-500 text-sm italic">Este pedido no tiene observaciones.</p>
          )}
        </div>
      )}

      {/* Tab: Historial */}
      {tab === "history" && (
        <div className="card">
          <HistoryTab orderId={id} />
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <EditOrderModal
          order={data}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            qc.invalidateQueries({ queryKey: ["order", id] });
            qc.invalidateQueries({ queryKey: ["orders"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            qc.invalidateQueries({ queryKey: ["production-overview"] });
            qc.invalidateQueries({ queryKey: ["upcoming-deliveries"] });
          }}
        />
      )}
    </div>
  );
}

// Parsea design_file — soporta formato viejo (string/array de URLs) y nuevo ({url,name})
function parseDesignFiles(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => typeof item === "string" ? { url: item, name: null } : item);
    }
    if (parsed && typeof parsed === "object" && parsed.url) return [parsed];
    return [{ url: raw, name: null }];
  } catch { return [{ url: raw, name: null }]; }
}

function EditOrderModal({ order, onClose, onSaved }) {
  const [customerId,    setCustomerId]    = useState(order.customer_id);
  const [customerQuery, setCustomerQuery] = useState(order.customer_name || "");
  const [customers,     setCustomers]     = useState([]);
  const [orderName,     setOrderName]     = useState(order.name || "");
  const [deliveryDate,  setDeliveryDate]  = useState(
    order.delivery_date ? order.delivery_date.slice(0, 10) : ""
  );
  const [description,   setDescription]  = useState(order.description || "");
  const [newFiles,      setNewFiles]      = useState([]);
  const [newFilePreviews, setNewFilePreviews] = useState([]);
  const [lightboxSrc,   setLightboxSrc]   = useState(null);
  const [items,         setItems]         = useState(
    (order.items || []).map((item) => ({
      product_id:          item.product_id,
      product_name:        item.product_name,
      gender:              item.gender,
      sizes:               item.sizes,
      unit_price:          item.unit_price ?? 0,
      unit_price_display:  item.unit_price ? Number(item.unit_price).toLocaleString("es-CO") : "",
      design_file_index:   item.design_file_index ?? null,
    }))
  );
  const [descuento,  setDescuento]  = useState(Number(order.descuento_porcentaje) || 0);
  const [error,  setError]  = useState("");
  const [saving, setSaving] = useState(false);

  const [keptFiles,     setKeptFiles]     = useState(() => parseDesignFiles(order.design_file));
  const slotsLeft = true; // sin límite de diseños

  async function searchCustomers(q) {
    setCustomerQuery(q);
    setCustomerId("");
    if (q.length < 2) { setCustomers([]); return; }
    const { data } = await api.get(`/customers?search=${encodeURIComponent(q)}&limit=10`);
    setCustomers(data.data);
  }

  function addItem(product) {
    if (!product) return;
    setItems((prev) => [...prev, { product_id: product.id, product_name: product.name, gender: "hombre", sizes: {}, unit_price: 0, unit_price_display: "", design_file_index: null }]);
  }
  function updateItem(index, field, value) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }
  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!items.length) return setError("Debe haber al menos un producto.");
    setError("");
    setSaving(true);
    try {
      const formData = new FormData();
      if (customerId && customerId !== order.customer_id) formData.append("customer_id", customerId);
      formData.append("name", orderName);
      if (deliveryDate) formData.append("delivery_date", deliveryDate);
      formData.append("description", description);
      formData.append("items", JSON.stringify(items.map(({ product_id, gender, sizes, unit_price, design_file_index }) => ({
        product_id, gender, sizes, unit_price: parseFloat(unit_price) || 0, design_file_index: design_file_index ?? null,
      }))));
      formData.append("design_files_keep", JSON.stringify(keptFiles));
      formData.append("descuento_porcentaje", descuento ?? 0);
      newFiles.forEach((f) => formData.append("design", f));

      await api.put(`/orders/${order.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 overflow-y-auto overflow-x-hidden py-8">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl mx-4 shadow-2xl overflow-x-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-white font-semibold">Editar pedido #{order.order_number}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Cliente */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Cliente</label>
            <div className="relative">
              <input className="input-field" placeholder="Buscar por nombre o documento..."
                value={customerQuery}
                onChange={(e) => searchCustomers(e.target.value)} />
              {customerId && customerId === order.customer_id && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">actual</span>
              )}
              {customers.length > 0 && (
                <ul className="absolute z-10 w-full bg-zinc-800 border border-zinc-700 rounded-lg mt-1 shadow-xl">
                  {customers.map((c) => (
                    <li key={c.id}
                      className="px-3 py-2 hover:bg-zinc-700 cursor-pointer text-sm"
                      onClick={() => { setCustomerId(c.id); setCustomerQuery(c.name); setCustomers([]); }}>
                      <span className="text-white font-medium">{c.name}</span>
                      <span className="text-zinc-400 ml-2">{c.document_number}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Nombre del pedido */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Nombre del pedido</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ej: Uniformes Ciclismo Club Medellín"
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              maxLength={255}
            />
          </div>

          {/* Fecha de entrega */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Fecha de entrega</label>
            <input type="date" className="input-field" value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)} />
          </div>

          {/* Diseños */}
          <div>
            <label className="block text-xs text-zinc-400 mb-2">
              Diseños adjuntos ({keptFiles.length + newFiles.length})
            </label>

            {/* Miniaturas existentes con opción de eliminar */}
            {keptFiles.length > 0 && (
              <div className="flex gap-3 flex-wrap mb-3">
                {keptFiles.map((f, i) => {
                  const url = fileUrl(f.url ?? f);
                  const rawUrl = f.url ?? f;
                  const pdf = rawUrl.toLowerCase().endsWith(".pdf") || rawUrl.includes("/raw/upload/");
                  const label = f.name ? f.name.replace(/\.[^.]+$/, "") : (keptFiles.length > 1 ? `PDF ${i + 1}` : "PDF");
                  return (
                    <div key={i} className="relative group/thumb">
                      {pdf ? (
                        <a href={url} target="_blank" rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center w-16 h-16 rounded-lg
                                     bg-zinc-700 border-2 border-zinc-500 hover:border-brand-green
                                     transition-colors text-zinc-200 hover:text-brand-green text-xs gap-0.5 px-1">
                          <IconDocument />
                          <span className="truncate w-full text-center">{label}</span>
                        </a>
                      ) : (
                        <button type="button" onClick={() => setLightboxSrc(url)}
                          className="focus:outline-none">
                          <img src={url} alt={`Diseño ${i + 1}`}
                            className="w-16 h-16 rounded-lg object-cover border border-zinc-700
                                       hover:border-brand-green transition-colors cursor-zoom-in" />
                        </button>
                      )}
                      <button type="button"
                        onClick={() => setKeptFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-600 text-white
                                   text-xs flex items-center justify-center opacity-0
                                   group-hover/thumb:opacity-100 transition-opacity hover:bg-red-500">
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Agregar nuevos archivos */}
            <>
              <input type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.avif,.pdf" multiple className="input-field text-sm"
                onChange={(e) => {
                  const picked = Array.from(e.target.files);
                  e.target.value = "";
                  setNewFiles(prev => {
                    const combined = [...prev, ...picked];
                    setNewFilePreviews(combined.map(f => f.type.startsWith("image/") ? URL.createObjectURL(f) : null));
                    return combined;
                  });
                }} />
              {newFiles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {newFiles.map((f, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">
                      {f.name}
                      <button type="button" className="text-zinc-500 hover:text-red-400 ml-1"
                        onClick={() => setNewFiles(prev => {
                          const next = prev.filter((_, idx) => idx !== i);
                          setNewFilePreviews(next.map(f2 => f2.type.startsWith("image/") ? URL.createObjectURL(f2) : null));
                          return next;
                        })}>✕</button>
                    </span>
                  ))}
                </div>
              )}
            </>
          </div>

          {/* Lightbox */}
          {lightboxSrc && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
              onClick={() => setLightboxSrc(null)}>
              <button className="absolute top-4 right-4 text-white text-3xl leading-none hover:text-zinc-300"
                onClick={() => setLightboxSrc(null)}>✕</button>
              <img src={lightboxSrc} alt="Diseño"
                className="max-w-[90vw] max-h-[90vh] object-contain rounded shadow-2xl"
                onClick={(e) => e.stopPropagation()} />
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Observaciones</label>
            <textarea className="input-field resize-none" rows={6} value={description}
              onChange={(e) => setDescription(e.target.value)} placeholder="Notas adicionales..." />
          </div>

          {/* Productos */}
          <div className="space-y-3">
            <h3 className="text-white font-medium text-sm">Productos</h3>
            <CascadeFilter onProductSelect={addItem} />

            {(() => {
              // Lista unificada de archivos de diseño para el selector
              const allDesignFiles = [
                ...keptFiles.map((f) => {
                  const rawUrl = f.url ?? f;
                  const isPdfFile = String(rawUrl).toLowerCase().endsWith(".pdf") || String(rawUrl).includes("/raw/upload/");
                  const resolvedUrl = fileUrl(rawUrl);
                  return { url: resolvedUrl, previewUrl: isPdfFile ? null : resolvedUrl, isPdf: isPdfFile, label: f.name || String(rawUrl).split("/").pop() };
                }),
                ...newFiles.map((f, fi) => ({
                  url: newFilePreviews[fi] || null,
                  previewUrl: newFilePreviews[fi] || null,
                  isPdf: !newFilePreviews[fi],
                  label: f.name,
                })),
              ];
              return items.map((item, i) => (
                <div key={i} className="bg-zinc-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.design_file_index != null && allDesignFiles[item.design_file_index] ? (
                        allDesignFiles[item.design_file_index].isPdf ? (
                          <PdfThumbnail url={allDesignFiles[item.design_file_index].url} width={32} btnClassName="rounded border border-zinc-600" />
                        ) : (
                          <img src={allDesignFiles[item.design_file_index].previewUrl} alt="diseño"
                            className="w-8 h-8 rounded object-cover border border-zinc-600 shrink-0" />
                        )
                      ) : null}
                      <span className="text-white font-medium text-sm">{item.product_name}</span>
                    </div>
                    <button type="button" onClick={() => removeItem(i)}
                      className="text-zinc-500 hover:text-red-400 transition-colors">✕</button>
                  </div>
                  <div className="flex gap-4 items-center flex-wrap">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Género</label>
                      <select className="input-field w-auto" value={item.gender}
                        onChange={(e) => updateItem(i, "gender", e.target.value)}>
                        {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Precio unitario</label>
                      <input type="text" inputMode="numeric" className="input-field w-36"
                        value={item.unit_price_display ?? ""}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "");
                          updateItem(i, "unit_price", Number(digits) || 0);
                          updateItem(i, "unit_price_display", digits ? Number(digits).toLocaleString("es-CO") : "");
                        }}
                        placeholder="$0" />
                    </div>
                  </div>
                  {allDesignFiles.length > 0 && (
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Diseño relacionado</label>
                      <div className="flex gap-2 flex-wrap">
                        {allDesignFiles.map((df, fi) => (
                          <button key={fi} type="button"
                            onClick={() => updateItem(i, "design_file_index", item.design_file_index === fi ? null : fi)}
                            className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-colors flex items-center justify-center shrink-0
                              ${item.design_file_index === fi ? "border-brand-green" : "border-zinc-600 hover:border-zinc-400"}`}>
                            {df.isPdf ? (
                              <PdfThumbnail url={df.url} width={40} />
                            ) : (
                              <img src={df.previewUrl} alt={df.label} className="w-full h-full object-cover" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <SizeQuantityGrid
                    gender={item.gender}
                    sizes={item.sizes}
                    onChange={(sizes) => updateItem(i, "sizes", sizes)}
                  />
                </div>
              ));
            })()}

            {items.length === 0 && (
              <p className="text-zinc-500 text-sm text-center py-3">Sin productos. Agrega uno con el filtro.</p>
            )}
          </div>

          {/* Descuento */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Descuento (%)</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={100}
                className="input-field w-28"
                value={descuento}
                onChange={(e) => setDescuento(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                placeholder="0"
              />
              {descuento > 0 && (
                <span className="text-red-400 text-sm font-medium">−{descuento}% sobre el total</span>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const METHODS = [
  { value: "efectivo",      label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "link_bold",     label: "Link Bold" },
];
const BANKS = ["Bancolombia", "Nequi", "Davivienda", "Bold"];

function EditPaymentForm({ payment, orderId, onDone, onCancel }) {
  const [amount,        setAmount]        = useState(String(Math.round(Number(payment.amount))));
  const [amountDisplay, setAmountDisplay] = useState(Number(payment.amount).toLocaleString("es-CO"));
  const [method,   setMethod]   = useState(payment.method);
  const [bank,     setBank]     = useState(payment.bank || "");
  const [paidAt,   setPaidAt]   = useState(payment.paid_at ? payment.paid_at.slice(0, 10) : "");
  const [receipt,  setReceipt]  = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return setError("Ingresa un monto válido.");
    if (method === "transferencia" && !bank) return setError("Selecciona el banco.");
    setError("");
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("amount", parseFloat(amount));
      formData.append("method", method);
      formData.append("bank", method === "transferencia" ? bank : "");
      formData.append("paid_at", paidAt);
      if (receipt) formData.append("receipt", receipt);
      await api.patch(`/financial/${orderId}/payments/${payment.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || "Error al actualizar el abono.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-800 rounded-lg p-4 space-y-3 mb-2">
      <p className="text-white text-sm font-medium">Editar Abono #{payment.payment_number}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Monto</label>
          <input type="text" inputMode="numeric" className="input-field"
            value={amountDisplay}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              setAmount(digits);
              setAmountDisplay(digits ? Number(digits).toLocaleString("es-CO") : "");
            }} placeholder="$0" autoFocus />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Fecha de pago</label>
          <input type="date" className="input-field" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Método</label>
          <select className="input-field" value={method} onChange={(e) => { setMethod(e.target.value); setBank(""); }}>
            {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        {method === "transferencia" && (
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Banco</label>
            <select className="input-field" value={bank} onChange={(e) => setBank(e.target.value)}>
              <option value="">Seleccionar...</option>
              {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        )}
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Reemplazar comprobante (opcional)</label>
        <input type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.avif,.pdf" className="input-field text-sm"
          onChange={(e) => setReceipt(e.target.files[0] || null)} />
      </div>
      {error && <div className="bg-red-950 border border-red-800 text-red-300 text-xs px-3 py-2 rounded-lg">{error}</div>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary text-xs py-1 px-3" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-primary text-xs py-1 px-3" disabled={saving}>
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

function FinancialTab({ order, onRefresh, onPreviewImage, onPreviewPdf }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [amount,        setAmount]        = useState("");
  const [amountDisplay, setAmountDisplay] = useState("");
  const [method,   setMethod]   = useState("efectivo");
  const [bank,     setBank]     = useState("");
  const [paidAt,   setPaidAt]   = useState(new Date().toISOString().slice(0, 10));
  const [receipt,  setReceipt]  = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const nextNumber = order.payments?.length
    ? Math.max(...order.payments.map((p) => p.payment_number)) + 1
    : 1;
  const canAdd = Number(order.balance) > 0;

  async function handleAddPayment(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return setError("Ingresa un monto válido.");
    if (method === "transferencia" && !bank) return setError("Selecciona el banco.");
    setError("");
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("payment_number", nextNumber);
      formData.append("amount", parseFloat(amount));
      formData.append("method", method);
      if (method === "transferencia") formData.append("bank", bank);
      formData.append("paid_at", paidAt);
      if (receipt) formData.append("receipt", receipt);

      await api.post(`/financial/${order.id}/payments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setShowForm(false);
      setAmount("");
      setAmountDisplay("");
      setMethod("efectivo");
      setBank("");
      setReceipt(null);
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || "Error al registrar el abono.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(paymentId) {
    if (!confirm("¿Eliminar este abono?")) return;
    try {
      await api.delete(`/financial/${order.id}/payments/${paymentId}`);
      onRefresh();
    } catch {
      alert("No se pudo eliminar el abono.");
    }
  }

  return (
    <div className="card space-y-4">
      {/* Totales */}
      {Number(order.descuento_porcentaje) > 0 && (
        <div className="flex items-center justify-between px-1 text-sm">
          <span className="text-zinc-500">Descuento aplicado</span>
          <span className="text-red-400 font-medium">{Number(order.descuento_porcentaje)}%</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-800 rounded-lg p-3 text-center">
          <p className="text-xs text-zinc-400 mb-1">Total</p>
          <p className="text-white text-xl font-bold">${Number(order.total).toLocaleString()}</p>
        </div>
        <div className="bg-zinc-800 rounded-lg p-3 text-center">
          <p className="text-xs text-zinc-400 mb-1">Pagado</p>
          <p className="text-brand-green text-xl font-bold">${Number(order.amount_paid).toLocaleString()}</p>
        </div>
        <div className="bg-zinc-800 rounded-lg p-3 text-center">
          <p className="text-xs text-zinc-400 mb-1">Saldo</p>
          <p className="text-yellow-400 text-xl font-bold">${Number(order.balance).toLocaleString()}</p>
        </div>
      </div>

      {/* Lista de abonos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-zinc-400 text-sm font-medium">Abonos</h3>
          {canAdd && !showForm && (
            <button className="btn-primary text-xs py-1 px-3" onClick={() => setShowForm(true)}>
              + Agregar abono
            </button>
          )}
        </div>

        {order.payments?.length === 0 && !showForm && (
          <p className="text-zinc-500 text-sm">Sin abonos registrados.</p>
        )}

        {order.payments?.map((p) => (
          <div key={p.id}>
            {editingId === p.id ? (
              <EditPaymentForm
                payment={p}
                orderId={order.id}
                onDone={() => { setEditingId(null); onRefresh(); }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2.5 mb-2">
                {/* Izquierda: número + método + fecha + banco */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-white text-sm font-medium">Abono #{p.payment_number} · {p.method}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.paid_at && (
                      <span className="text-zinc-500 text-xs">
                        {new Date(p.paid_at).toLocaleDateString("es-CO")}
                      </span>
                    )}
                    {p.bank && <span className="text-zinc-500 text-xs">{p.bank}</span>}
                  </div>
                </div>
                {/* Derecha: precio arriba, iconos abajo */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-white font-semibold text-base">${Number(p.amount).toLocaleString("es-CO")}</span>
                  <div className="flex items-center gap-1">
                  {p.receipt_url && (
                    <button
                      title="Ver comprobante"
                      onClick={() => {
                        const url = fileUrl(p.receipt_url);
                        const isPdf = p.receipt_url.toLowerCase().endsWith(".pdf") || p.receipt_url.includes("/raw/");
                        isPdf ? onPreviewPdf(url) : onPreviewImage(url);
                      }}
                      className="text-zinc-500 hover:text-brand-green transition-colors p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  )}
                  <button
                    title="Editar abono"
                    onClick={() => setEditingId(p.id)}
                    className="text-zinc-500 hover:text-brand-green transition-colors p-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                    </svg>
                  </button>
                  <button
                    title="Eliminar abono"
                    onClick={() => handleDelete(p.id)}
                    className="text-zinc-600 hover:text-red-400 transition-colors p-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  </div>{/* fin iconos */}
                </div>{/* fin columna derecha */}
              </div>
            )}
          </div>
        ))}

        {/* Formulario nuevo abono */}
        {showForm && (
          <form onSubmit={handleAddPayment} className="bg-zinc-800 rounded-lg p-4 space-y-3 mt-2">
            <p className="text-white text-sm font-medium">Abono #{nextNumber}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Monto</label>
                <input type="text" inputMode="numeric" className="input-field"
                  value={amountDisplay}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setAmount(digits);
                    setAmountDisplay(digits ? Number(digits).toLocaleString("es-CO") : "");
                  }}
                  placeholder="$0" autoFocus />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Fecha de pago</label>
                <input type="date" className="input-field"
                  value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Método</label>
                <select className="input-field" value={method}
                  onChange={(e) => { setMethod(e.target.value); setBank(""); }}>
                  {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              {method === "transferencia" && (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Banco</label>
                  <select className="input-field" value={bank} onChange={(e) => setBank(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Comprobante (opcional · JPG, PNG o PDF)</label>
              <input type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.avif,.pdf" className="input-field text-sm"
                onChange={(e) => setReceipt(e.target.files[0] || null)} />
              {receipt && <p className="text-xs text-zinc-400 mt-1">{receipt.name}</p>}
            </div>
            {error && (
              <div className="bg-red-950 border border-red-800 text-red-300 text-xs px-3 py-2 rounded-lg">{error}</div>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-secondary text-xs py-1 px-3"
                onClick={() => { setShowForm(false); setError(""); setReceipt(null); }}>Cancelar</button>
              <button type="submit" className="btn-primary text-xs py-1 px-3" disabled={saving}>
                {saving ? "Guardando..." : "Registrar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ProgressMatrix({ orderId, items }) {
  const AREAS = [
    ["corte", "Corte"],
    ["diseno_disenar", "Diseño"],
    ["impresion", "Impresión"],
    ["sublimacion", "Sublim."],
    ["ensamble", "Ensamble"],
    ["terminados", "Terminados"],
  ];

  const { data: progress, isLoading } = useQuery({
    queryKey: ["order-progress", orderId],
    queryFn:  () => api.get(`/production/order/${orderId}/progress`).then((r) => r.data.data),
  });

  if (isLoading) return <div className="card text-zinc-500 text-sm">Cargando avance...</div>;

  const doneSet = new Set(
    (progress || [])
      .filter((p) => p.is_done)
      .map((p) => `${p.order_item_id}|${p.area}|${p.size}`)
  );

  // Generar filas: una por cada (item, talla con qty>0)
  const rows = [];
  items.forEach((item) => {
    Object.entries(item.sizes || {}).forEach(([size, qty]) => {
      if (Number(qty) > 0) rows.push({ itemId: item.id, name: item.product_name, size, qty });
    });
  });

  if (rows.length === 0) return null;

  // Totales por área
  const totalsByArea = {};
  AREAS.forEach(([key]) => {
    totalsByArea[key] = rows.filter((r) => doneSet.has(`${r.itemId}|${key}|${r.size}`)).length;
  });

  return (
    <div className="card overflow-x-auto">
      <h3 className="text-white font-medium text-sm mb-3">Avance por producto y área</h3>
      <table className="w-full text-xs min-w-[640px]">
        <thead>
          <tr className="border-b border-zinc-700">
            <th className="text-left text-zinc-400 font-medium pb-2 pr-2">Producto</th>
            {AREAS.map(([key, label]) => (
              <th key={key} className="text-center text-zinc-400 font-medium pb-2 px-1">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.itemId}-${r.size}`} className="border-b border-zinc-800">
              <td className="py-2 pr-2 text-white">
                <span className="font-medium">{r.name}</span>
                <span className="text-zinc-500"> · {r.size} ({r.qty})</span>
              </td>
              {AREAS.map(([key]) => {
                const done = doneSet.has(`${r.itemId}|${key}|${r.size}`);
                return (
                  <td key={key} className="text-center px-1 py-2">
                    {done ? <span className="text-brand-green text-base">✓</span> : <span className="text-zinc-700">·</span>}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="border-t-2 border-zinc-700">
            <td className="py-2 pr-2 text-zinc-400 font-medium">Total</td>
            {AREAS.map(([key]) => (
              <td key={key} className="text-center px-1 py-2 text-zinc-300 font-medium">
                {totalsByArea[key]}/{rows.length}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function HistoryTab({ orderId }) {
  const { data, isLoading } = useQuery({
    queryKey: ["order-history", orderId],
    queryFn:  () => api.get(`/orders/${orderId}/history`).then((r) => r.data.data),
  });

  if (isLoading) return <p className="text-zinc-500 text-sm">Cargando historial...</p>;

  return (
    <div className="space-y-2">
      {data?.map((h) => (
        <div key={h.id} className="bg-zinc-800 rounded-lg px-3 py-2.5">
          <p className="text-zinc-500 text-xs">{new Date(h.created_at).toLocaleString("es-CO")}</p>
          <p className="text-zinc-400 text-xs mt-0.5">{h.user_name}</p>
          <p className="text-white text-sm mt-1">{h.action}</p>
        </div>
      ))}
    </div>
  );
}
