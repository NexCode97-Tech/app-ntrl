import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../config/api.js";

const STATUS_LABELS = {
  pending:     { label: "Pendiente",   cls: "badge-pending"   },
  in_progress: { label: "En proceso",  cls: "badge-progress"  },
  completed:   { label: "Completado",  cls: "badge-completed" },
  delivered:   { label: "Entregado",   cls: "badge-delivered" },
};

const STATUS_BADGE = {
  pending:     "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  in_progress: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  completed:   "bg-green-500/15 text-green-400 border border-green-500/30",
  delivered:   "bg-brand-green/15 text-brand-green border border-brand-green/30",
};

function shortDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

function OrderCard({ order, onClick, index = 0 }) {
  const s = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
  const total   = Number(order.total) || 0;
  const balance = Number(order.balance) || 0;
  const paid    = Math.max(total - balance, 0);
  const pct     = total > 0 ? Math.round((paid / total) * 100) : 0;
  const initials = order.customer_name?.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

  // Urgencia: entrega dentro de 7 días
  let deliveryUrgent = false;
  if (order.delivery_date && order.status !== "delivered") {
    const days = (new Date(order.delivery_date) - new Date()) / (1000 * 60 * 60 * 24);
    deliveryUrgent = days <= 7;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.03, duration: 0.22 }}
      whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(0,0,0,0.45)" }}
      onClick={onClick}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className="group relative overflow-hidden bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 cursor-pointer"
    >
      {/* Spotlight */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: "radial-gradient(220px circle at var(--mx,50%) var(--my,50%), rgba(197,255,58,0.07), transparent 60%)" }} />

      {/* Top: número + estado */}
      <div className="relative flex items-center justify-between gap-2">
        <span className="text-brand-green font-mono font-bold text-sm">#{order.order_number}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_BADGE[order.status] || STATUS_BADGE.pending}`}>{s.label}</span>
      </div>

      {/* Cliente + avatar */}
      <div className="relative flex items-center gap-2.5 mt-3">
        <div className="w-9 h-9 rounded-lg bg-brand-green/20 border border-brand-green/30 flex items-center justify-center shrink-0">
          <span className="text-brand-green font-bold text-xs">{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm leading-tight truncate">{order.customer_name}</p>
          {order.name && <p className="text-zinc-500 text-[11px] truncate">{order.name}</p>}
        </div>
      </div>

      {/* Pago */}
      <div className="relative mt-3">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="text-zinc-500 tabular-nums">Total <span className="text-white font-semibold">${total.toLocaleString("es-CO")}</span></span>
          {balance > 0
            ? <span className="text-yellow-400 font-semibold tabular-nums">Saldo ${balance.toLocaleString("es-CO")}</span>
            : total > 0 && <span className="text-brand-green font-semibold">Pagado</span>}
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-lime-500 to-brand-green transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Fechas */}
      <div className="relative flex items-center justify-between text-[11px] text-zinc-500 mt-3 pt-2.5 border-t border-zinc-800">
        <span>Creado <span className="text-zinc-400">{shortDate(order.created_at) || "—"}</span></span>
        <span>Entrega <span className={deliveryUrgent ? "text-yellow-400 font-medium" : order.delivery_date ? "text-zinc-400" : "text-zinc-600"}>{shortDate(order.delivery_date) || "Sin fecha"}</span></span>
      </div>
    </motion.div>
  );
}

const STATUS_FILTER_OPTS = [
  { value: "pending",     label: "Pendiente",  dot: "#eab308" },
  { value: "in_progress", label: "En proceso", dot: "#60a5fa" },
  { value: "completed",   label: "Completado", dot: "#4ade80" },
  { value: "delivered",   label: "Entregado",  dot: "#c5ff3a" },
];

function StatusFilterDropdown({ selected, onChange, counts }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const isAll = selected.length === 0;
  const activeDots = isAll
    ? STATUS_FILTER_OPTS.map((o) => o.dot)
    : STATUS_FILTER_OPTS.filter((o) => selected.includes(o.value)).map((o) => o.dot);

  function toggle(value) {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value));
    else                          onChange([...selected, value]);
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded-lg h-10 px-3 transition-colors"
      >
        <div className="flex">
          {activeDots.map((c, i) => (
            <span key={i} className="w-2.5 h-2.5 rounded-full border-2 border-zinc-900" style={{ backgroundColor: c, marginLeft: i === 0 ? 0 : -4 }} />
          ))}
        </div>
        <span className="text-zinc-200 text-sm font-medium">Estado</span>
        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 tabular-nums">
          {isAll ? STATUS_FILTER_OPTS.length : selected.length}/{STATUS_FILTER_OPTS.length}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-2 w-60 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-1.5">
          {STATUS_FILTER_OPTS.map((o) => {
            const on = isAll || selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-zinc-800 transition-colors text-left"
              >
                <span className={`w-[18px] h-[18px] rounded-md border flex items-center justify-center shrink-0 transition-colors
                  ${on ? "bg-brand-green border-brand-green" : "border-zinc-600"}`}>
                  {on && <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </span>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: o.dot }} />
                <span className="flex-1 text-sm text-zinc-200">{o.label}</span>
                <span className="text-xs text-zinc-500 tabular-nums">{counts?.[o.value] ?? "—"}</span>
              </button>
            );
          })}
          <div className="h-px bg-zinc-800 my-1.5 mx-2" />
          <button
            type="button"
            onClick={() => onChange([])}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-zinc-800 transition-colors text-left"
          >
            <span className="text-sm text-zinc-400">Mostrar todos</span>
            <span className="text-xs text-zinc-500 tabular-nums">{counts?.[""] ?? "—"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [search,    setSearch]    = useState("");
  const [statusSel, setStatusSel] = useState([]); // [] = todos los estados
  const [page,      setPage]      = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", page, search, statusSel],
    queryFn:  () => api.get(`/orders?page=${page}&limit=20&search=${search}&status=${statusSel.join(",")}`)
                       .then((r) => r.data),
    keepPreviousData: true,
  });

  // Conteos por estado (queries livianas — limit=1, solo necesitamos pagination.total)
  const { data: counts } = useQuery({
    queryKey: ["orders-counts"],
    queryFn: async () => {
      const statuses = ["", "pending", "in_progress", "completed", "delivered"];
      const results = await Promise.all(
        statuses.map((s) => api.get(`/orders?page=1&limit=1&status=${s}`).then((r) => r.data))
      );
      return {
        "":            results[0]?.total ?? 0,
        pending:       results[1]?.total ?? 0,
        in_progress:   results[2]?.total ?? 0,
        completed:     results[3]?.total ?? 0,
        delivered:     results[4]?.total ?? 0,
      };
    },
    staleTime: 30_000,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-white font-bold text-xl lg:hidden">Pedidos</h1>

      {/* Toolbar — estado + búsqueda + nuevo, en una sola fila (desktop) */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        {/* Búsqueda + botón (en móvil van arriba juntos) */}
        <div className="flex gap-2 sm:order-2 sm:flex-1">
          <div className="relative flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              className="w-full h-10 bg-zinc-900 border border-zinc-700 focus:border-zinc-500 rounded-lg pl-9 pr-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
              placeholder="Buscar por número o cliente..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button className="btn-primary h-10 shrink-0 whitespace-nowrap flex items-center gap-1.5" onClick={() => navigate("/orders/new")}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span className="hidden xs:inline sm:inline">Nuevo pedido</span>
          </button>
        </div>

        {/* Filtro de estado — en móvil scrollea, en desktop va a la izquierda */}
        <div className="sm:order-1 overflow-x-auto scrollbar-none">
          <StatusFilterDropdown
            selected={statusSel}
            onChange={(v) => { setStatusSel(v); setPage(1); }}
            counts={counts}
          />
        </div>
      </div>

      {/* Cards — todos los tamaños */}
      <div className="space-y-3 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-4 md:space-y-0">
        {isLoading && (
          <p className="text-center text-zinc-500 py-8">Cargando...</p>
        )}
        {data?.data?.map((order, i) => (
          <OrderCard
            key={order.id}
            order={order}
            index={i}
            onClick={() => navigate(`/orders/${order.id}`)}
          />
        ))}
        {!isLoading && !data?.data?.length && (
          <p className="text-center text-zinc-500 py-8">No hay pedidos.</p>
        )}
      </div>

      {/* Desktop — Table (oculta, reemplazada por cards) */}
      <div className="hidden card overflow-hidden p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead className="bg-zinc-800 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-center">Estado</th>
              <th className="px-4 py-3 text-center">Creación</th>
              <th className="px-4 py-3 text-center">Entrega</th>
              <th className="px-4 py-3 text-center">Total</th>
              <th className="px-4 py-3 text-center">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {isLoading && (
              <tr><td colSpan={8} className="text-center py-8 text-zinc-500">Cargando...</td></tr>
            )}
            {data?.data?.map((order) => {
              const s = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
              return (
                <tr key={order.id}
                  className="hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/orders/${order.id}`)}>
                  <td className="px-4 py-3 font-mono text-brand-green font-semibold">#{order.order_number}</td>
                  <td className="px-4 py-3 text-zinc-300 max-w-[180px] truncate">{order.name || <span className="text-zinc-600">—</span>}</td>
                  <td className="px-4 py-3 text-white">{order.customer_name}</td>
                  <td className="px-4 py-3 text-center"><span className={`${s.cls} whitespace-nowrap`}>{s.label}</span></td>
                  <td className="px-4 py-3 text-center text-zinc-400">{order.created_at ? new Date(order.created_at).toLocaleDateString("es-CO") : "—"}</td>
                  <td className="px-4 py-3 text-center text-zinc-400">{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString("es-CO") : "—"}</td>
                  <td className="px-4 py-3 text-center text-white">${Number(order.total).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-yellow-400">${Number(order.balance).toLocaleString()}</td>
                </tr>
              );
            })}
            {!isLoading && !data?.data?.length && (
              <tr><td colSpan={8} className="text-center py-8 text-zinc-500">No hay pedidos.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data?.total > 20 && (
        <div className="flex items-center justify-between text-sm text-zinc-400">
          <span>Mostrando {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} de {data.total}</span>
          <div className="flex gap-2">
            <button className="btn-secondary py-1 px-3" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Anterior</button>
            <button className="btn-secondary py-1 px-3" disabled={page * 20 >= data.total} onClick={() => setPage((p) => p + 1)}>Siguiente →</button>
          </div>
        </div>
      )}
    </div>
  );
}
