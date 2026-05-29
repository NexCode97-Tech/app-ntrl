import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Sector,
} from "recharts";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { api } from "../../config/api.js";

/* ── Constantes ─────────────────────────────────────────────────────── */
const GENDER_META = {
  hombre:  { label: "Hombre",   color: "#3b82f6" },
  mujer:   { label: "Mujer",    color: "#ec4899" },
  nino:    { label: "Niño/a",   color: "#f59e0b" },
  unisex:  { label: "Unisex",   color: "#a78bfa" },
};

const STATUS_COLORS = {
  pending: "#71717a", in_progress: "#eab308", completed: "#22c55e", delivered: "#98f909",
};

const STATUS_LABELS = {
  pending: "Pendiente", in_progress: "En proceso", completed: "Completado", delivered: "Entregado",
};

// Curva ease-out fuerte (Emil Kowalski)
const EASE_OUT = [0.23, 1, 0.32, 1];

/* ── Helpers ─────────────────────────────────────────────────────────── */
const formatPesos   = (v) => `$${Number(v).toLocaleString("es-CO")}`;
const formatShort   = (v) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toLocaleString("es-CO",     { maximumFractionDigits: 1 })}K`;
  return `$${v}`;
};
const formatMonth   = (m) => {
  if (!m) return "";
  const [year, month] = m.split("-");
  return new Date(year, month - 1).toLocaleDateString("es-CO", { month: "short", year: "numeric" });
};

/* ── Animación: variantes stagger ────────────────────────────────────── */
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
};

/* ── Componente Dona activa ──────────────────────────────────────────── */
function ActiveShape(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, dataArray } = props;
  const total = (dataArray ?? []).reduce((s, d) => s + d.value, 0);
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#fff" fontSize={11} fontWeight="700">{payload.name}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill={fill} fontSize={13} fontWeight="800">
        {total > 0 ? `${Math.round((payload.value / total) * 100)}%` : "0%"}
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 7}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 5} outerRadius={innerRadius - 2}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ReportsPage
═══════════════════════════════════════════════════════════════════════ */
export default function ReportsPage() {
  const [loadingExport,    setLoadingExport]    = useState({ pdf: false, excel: false });
  const [activePieIdx,     setActivePieIdx]     = useState(null);
  const [selectedMonth,    setSelectedMonth]    = useState(null);
  const [selectedSport,    setSelectedSport]    = useState(null);
  const [selectedDepto,    setSelectedDepto]    = useState(null);

  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  /* ── Queries ────────────────────────────────────────────────────────── */
  const { data, isLoading } = useQuery({
    queryKey:  ["dashboard"],
    queryFn:   () => api.get("/dashboard").then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: monthlyHistory } = useQuery({
    queryKey: ["dashboard-history"],
    queryFn:  () => api.get("/dashboard/history").then((r) => r.data.data),
    staleTime: 0,
  });

  const { data: sportByMonth } = useQuery({
    queryKey: ["sport-by-month", selectedMonth ?? currentMonth],
    queryFn:  () => api.get(`/dashboard/sport-by-month?month=${selectedMonth ?? currentMonth}`).then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: topCustomers } = useQuery({
    queryKey: ["top-customers"],
    queryFn:  () => api.get("/dashboard/top-customers").then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: geoData } = useQuery({
    queryKey: ["geo-by-month", selectedMonth ?? currentMonth],
    queryFn:  () => api.get(`/dashboard/geo-by-month?month=${selectedMonth ?? currentMonth}`).then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: genderData } = useQuery({
    queryKey: ["gender-by-month", selectedMonth ?? currentMonth],
    queryFn:  () => api.get(`/dashboard/gender-by-month?month=${selectedMonth ?? currentMonth}`).then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  /* ── Datos derivados ─────────────────────────────────────────────────── */
  const selectedSnapshot = useMemo(() => {
    if (!selectedMonth) return null;
    return (monthlyHistory ?? []).find((s) => s.month === selectedMonth) ?? null;
  }, [selectedMonth, monthlyHistory]);

  const financialDisplay = selectedSnapshot
    ? { total_revenue: selectedSnapshot.total_revenue, collected: selectedSnapshot.collected, pending: selectedSnapshot.pending }
    : data?.financial;

  const donutData = useMemo(() => {
    const collected = Number(financialDisplay?.collected || 0);
    const pending   = Number(financialDisplay?.pending   || 0);
    if (collected === 0 && pending === 0) return [];
    return [
      { name: "Recaudado",  value: collected, color: "#98f909" },
      { name: "Por cobrar", value: pending,   color: "#eab308" },
    ];
  }, [financialDisplay]);

  const byStatusData = useMemo(() => {
    const base = { pending: 0, in_progress: 0, completed: 0, delivered: 0 };
    if (selectedSnapshot) {
      Object.entries(selectedSnapshot.status_counts ?? {}).forEach(([k, v]) => { base[k] = Number(v); });
    } else {
      (data?.byStatus ?? []).forEach((r) => { base[r.status] = Number(r.total); });
    }
    return Object.entries(base).map(([status, total]) => ({ status, total, label: STATUS_LABELS[status] }));
  }, [data?.byStatus, selectedSnapshot]);

  const monthlyData = useMemo(() => {
    if (data?.monthly?.length) return data.monthly.map((r) => ({ ...r, Ingresos: Number(r.revenue) }));
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, orders: 0, Ingresos: 0 };
    });
  }, [data?.monthly]);

  const bySportData = useMemo(() => {
    const src = sportByMonth ?? data?.bySport ?? [];
    if (src.length) return src.map((r) => ({ ...r, Ingresos: Number(r.revenue) }));
    return [{ sport: "Sin datos aún", Ingresos: 0, orders: 0 }];
  }, [sportByMonth, data?.bySport]);

  const onPieEnter  = useCallback((_, i) => setActivePieIdx(i), []);
  const onPieLeave  = useCallback(() => setActivePieIdx(null), []);

  // Geo: agrupar por departamento y calcular totales
  const deptoTotals = useMemo(() => {
    const map = {};
    (geoData ?? []).forEach(({ department, orders, revenue }) => {
      if (!map[department]) map[department] = { department, orders: 0, revenue: 0 };
      map[department].orders  += Number(orders);
      map[department].revenue += Number(revenue);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [geoData]);

  // Ciudades del departamento seleccionado
  const ciudadesDepto = useMemo(() => {
    if (!selectedDepto) return [];
    return (geoData ?? [])
      .filter((r) => r.department === selectedDepto)
      .sort((a, b) => Number(b.revenue) - Number(a.revenue));
  }, [geoData, selectedDepto]);

  /* ── Exportar ────────────────────────────────────────────────────────── */
  async function downloadReport(type) {
    setLoadingExport((p) => ({ ...p, [type]: true }));
    try {
      const { data: blob } = await api.get(`/dashboard/report/${type}`, { responseType: "blob" });
      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = `reporte-ntrl-${new Date().toISOString().slice(0, 10)}.${type === "pdf" ? "pdf" : "xlsx"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Error al generar el reporte.");
    } finally {
      setLoadingExport((p) => ({ ...p, [type]: false }));
    }
  }

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-40 bg-zinc-800 rounded-lg" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-60 bg-zinc-800 rounded-xl" />
          <div className="h-60 bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="lg:hidden text-white font-bold text-xl">Reportes</h1>
        </div>

        {/* Selector de mes */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-zinc-500 text-xs">Período:</span>
          <select
            value={selectedMonth ?? ""}
            onChange={(e) => { setSelectedMonth(e.target.value || null); setSelectedSport(null); }}
            className="bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-green cursor-pointer transition-colors"
          >
            <option value="">{formatMonth(currentMonth)} (actual)</option>
            {(monthlyHistory ?? []).map((s) => (
              <option key={s.month} value={s.month}>{formatMonth(s.month)}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total facturado",    value: Number(financialDisplay?.total_revenue || 0), color: "text-brand-green",  border: "border-brand-green/20" },
          { label: "Recaudado",          value: Number(financialDisplay?.collected     || 0), color: "text-white",        border: "border-zinc-700/60"    },
          { label: "Pendiente de cobro", value: Number(financialDisplay?.pending       || 0), color: "text-yellow-400",   border: "border-yellow-500/20"  },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            variants={itemVariants}
            transition={{ delay: i * 0.06 }}
            className={`card text-center border ${kpi.border}`}
          >
            <p className="text-zinc-400 text-xs mb-2">{kpi.label}</p>
            <p className={`${kpi.color} text-2xl font-black tracking-tight`}>
              $<CountUp end={kpi.value} duration={1.2} separator="." decimal="," preserveValue />
            </p>
            <p className="text-zinc-600 text-[11px] mt-1">{formatMonth(selectedMonth ?? currentMonth)}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Fila 2: Dona + Ventas por deporte ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">

        {/* Dona — estado del dinero */}
        <motion.div variants={itemVariants} className="card flex flex-col">
          <h2 className="text-white font-semibold mb-4 text-sm">
            Estado del dinero
            <span className="text-zinc-600 font-normal text-xs ml-2">{formatMonth(selectedMonth ?? currentMonth)}</span>
          </h2>
          {donutData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <p className="text-zinc-600 text-sm">Sin datos financieros.</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6 flex-1">
              <div className="w-[180px] h-[180px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={78}
                      isAnimationActive animationBegin={200} animationDuration={900} animationEasing="ease-out"
                      dataKey="value"
                      activeIndex={activePieIdx}
                      activeShape={(props) => <ActiveShape {...props} dataArray={donutData} />}
                      onMouseEnter={onPieEnter}
                      onMouseLeave={onPieLeave}
                    >
                      {donutData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent" />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "#a1a1aa" }}
                      itemStyle={{ color: "#fff" }}
                      formatter={(v, name) => [formatPesos(v), name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4 flex-1 min-w-0 w-full">
                {donutData.map((d) => {
                  const total = donutData.reduce((s, x) => s + x.value, 0);
                  const pct   = total > 0 ? Math.round((d.value / total) * 100) : 0;
                  return (
                    <div key={d.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                          <span className="text-zinc-300 text-sm">{d.name}</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: d.color }}>{pct}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: d.color }}
                        />
                      </div>
                      <p className="text-zinc-500 text-xs mt-1">{formatPesos(d.value)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Ventas por deporte */}
        <motion.div variants={itemVariants} className="card flex flex-col min-h-[260px]">
          <h2 className="text-white font-semibold mb-4 text-sm">
            Ventas por deporte
            <span className="text-zinc-600 font-normal text-xs ml-2">{formatMonth(selectedMonth ?? currentMonth)}</span>
          </h2>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySportData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="sport" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={formatShort} width={55} />
                <Tooltip
                  cursor={{ fill: "#27272a" }}
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#a1a1aa" }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(v, name, props) => [
                    `${formatPesos(v)} · ${props.payload.orders} pedido${props.payload.orders !== 1 ? "s" : ""}`,
                    "Ingresos",
                  ]}
                />
                <Bar
                  dataKey="Ingresos"
                  radius={[5, 5, 0, 0]}
                  cursor="pointer"
                  onClick={(d) => setSelectedSport(d.sport === selectedSport ? null : d.sport)}
                  activeBar={{ fill: "#c5ff3a", filter: "drop-shadow(0 0 6px #98f909)" }}
                  isAnimationActive animationDuration={900} animationEasing="ease-out"
                >
                  {bySportData.map((entry) => (
                    <Cell
                      key={entry.sport}
                      fill={selectedSport === null || entry.sport === selectedSport ? "#98f909" : "#3f3f46"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* ── Fila 3: Ventas mensuales + Pedidos por estado ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">

        {/* Ventas mensuales */}
        <motion.div variants={itemVariants} className="card flex flex-col min-h-[260px]">
          <h2 className="text-white font-semibold mb-4 text-sm">
            Ventas mensuales
            <span className="text-zinc-600 font-normal text-xs ml-2">últimos 6 meses</span>
          </h2>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={formatMonth} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={formatShort} width={55} />
                <Tooltip
                  cursor={{ fill: "#27272a" }}
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#a1a1aa" }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(v, name, props) => [
                    `${formatPesos(v)} · ${props.payload.orders} pedido${props.payload.orders !== 1 ? "s" : ""}`,
                    "Ingresos",
                  ]}
                  labelFormatter={(m) => `${formatMonth(m)}${m === (selectedMonth ?? currentMonth) ? " ● seleccionado" : ""}`}
                />
                <Bar
                  dataKey="Ingresos"
                  radius={[5, 5, 0, 0]}
                  cursor="pointer"
                  onClick={(d) => setSelectedMonth(d.month === currentMonth ? null : d.month)}
                  activeBar={{ fill: "#c5ff3a", filter: "drop-shadow(0 0 6px #98f909)" }}
                  isAnimationActive animationDuration={900} animationEasing="ease-out"
                >
                  {monthlyData.map((entry) => (
                    <Cell
                      key={entry.month}
                      fill={entry.month === (selectedMonth ?? currentMonth) ? "#c5ff3a" : "#98f909"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-zinc-600 text-[11px] mt-2">Clic en una barra para filtrar el período.</p>
        </motion.div>

        {/* Pedidos por estado */}
        <motion.div variants={itemVariants} className="card flex flex-col">
          <h2 className="text-white font-semibold mb-4 text-sm">
            Pedidos por estado
            <span className="text-zinc-600 font-normal text-xs ml-2">{formatMonth(selectedMonth ?? currentMonth)}</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 flex-1">
            {byStatusData.map((item, i) => (
              <motion.div
                key={item.status}
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.06, ease: EASE_OUT }}
                className="bg-zinc-800/50 border border-zinc-700/40 rounded-xl text-center flex flex-col items-center justify-center py-5 hover:border-zinc-600 transition-colors"
              >
                <p className="text-3xl font-black leading-none" style={{ color: STATUS_COLORS[item.status] }}>
                  <CountUp end={item.total} duration={1} preserveValue />
                </p>
                <p className="text-zinc-500 text-xs mt-2">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Fila 4: Top 5 Clientes + Ventas por Género ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">

        {/* Top 5 Clientes */}
        <motion.div variants={itemVariants} className="card flex flex-col">
          <h2 className="text-white font-semibold mb-4 text-sm">
            Top 5 clientes
            <span className="text-zinc-600 font-normal text-xs ml-2">por facturación total</span>
          </h2>
          {!(topCustomers ?? []).length ? (
            <div className="flex-1 flex items-center justify-center py-8">
              <p className="text-zinc-600 text-sm">Sin datos.</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {(topCustomers ?? []).map((c, i) => {
                const max     = Number(topCustomers[0]?.revenue ?? 1);
                const revenue = Number(c.revenue);
                const pct     = Math.round((revenue / max) * 100);
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 * i, ease: EASE_OUT }}
                    className="flex items-center gap-3"
                  >
                    <span className={`shrink-0 w-6 text-center text-xs font-black ${i === 0 ? "text-brand-green" : i === 1 ? "text-zinc-300" : i === 2 ? "text-yellow-600" : "text-zinc-600"}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-zinc-200 text-sm truncate">{c.customer}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-zinc-500 text-xs">{c.orders} pedido{c.orders !== 1 ? "s" : ""}</span>
                          <span className="text-white font-bold text-sm">{formatShort(revenue)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: ["#98f909","#3b82f6","#f59e0b","#ec4899","#a78bfa"][i] }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Ventas por Género */}
        <motion.div variants={itemVariants} className="card flex flex-col">
          <h2 className="text-white font-semibold mb-4 text-sm">
            Ventas por género
            <span className="text-zinc-600 font-normal text-xs ml-2">{formatMonth(selectedMonth ?? currentMonth)}</span>
          </h2>
          {!(genderData ?? []).length ? (
            <div className="flex-1 flex items-center justify-center py-8">
              <p className="text-zinc-600 text-sm">Sin datos.</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {(genderData ?? []).map((g, i) => {
                const meta    = GENDER_META[g.gender] ?? { label: g.gender, color: "#71717a" };
                const maxRev  = Number(genderData[0]?.revenue ?? 1);
                const revenue = Number(g.revenue);
                const units   = Number(g.units);
                const pct     = Math.round((revenue / maxRev) * 100);
                return (
                  <motion.div
                    key={g.gender}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 * i, ease: EASE_OUT }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta.color }} />
                        <span className="text-zinc-200 text-sm font-medium">{meta.label}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className="text-zinc-500 text-xs">{units.toLocaleString("es-CO")} uds</span>
                        <span className="text-white font-bold text-sm">{formatShort(revenue)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: meta.color }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

      </div>

      {/* ── Fila 5: Distribución Geográfica ────────────────────────────── */}
      <motion.div variants={itemVariants} className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          <h2 className="text-white font-semibold text-sm flex-1">
            Distribución geográfica
            <span className="text-zinc-600 font-normal text-xs ml-2">{formatMonth(selectedMonth ?? currentMonth)}</span>
          </h2>
          {/* Selector departamento */}
          {deptoTotals.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-zinc-500 text-xs">Departamento:</span>
              <select
                value={selectedDepto ?? ""}
                onChange={(e) => setSelectedDepto(e.target.value || null)}
                className="bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-green cursor-pointer transition-colors"
              >
                <option value="">Todos</option>
                {deptoTotals.map((d) => (
                  <option key={d.department} value={d.department}>{d.department}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {!deptoTotals.length ? (
          <p className="text-zinc-600 text-sm text-center py-8">
            Sin datos geográficos — asegúrate de registrar ciudad y departamento en los clientes.
          </p>
        ) : !selectedDepto ? (
          /* Vista: ranking de departamentos */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {deptoTotals.map((d, i) => {
              const maxRev = Number(deptoTotals[0]?.revenue ?? 1);
              const pct    = Math.round((Number(d.revenue) / maxRev) * 100);
              return (
                <motion.button
                  key={d.department}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04, ease: EASE_OUT }}
                  onClick={() => setSelectedDepto(d.department)}
                  className="text-left bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-500 rounded-xl p-4 cursor-pointer transition-all active:scale-[0.98] group"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-white font-semibold text-sm leading-tight group-hover:text-brand-green transition-colors">
                      {d.department}
                    </span>
                    <span className="text-zinc-500 text-xs shrink-0">{d.orders} ped.</span>
                  </div>
                  <p className="text-brand-green font-bold text-base mb-2">{formatShort(d.revenue)}</p>
                  <div className="w-full bg-zinc-700 rounded-full h-1">
                    <div
                      className="h-1 rounded-full transition-all duration-700 bg-brand-green"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </motion.button>
              );
            })}
          </div>
        ) : (
          /* Vista: ciudades del departamento seleccionado */
          <div>
            <button
              onClick={() => setSelectedDepto(null)}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white mb-4 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Todos los departamentos
            </button>
            <p className="text-brand-green font-semibold text-sm mb-3">{selectedDepto}</p>
            <div className="space-y-3">
              {ciudadesDepto.map((c, i) => {
                const maxRev = Number(ciudadesDepto[0]?.revenue ?? 1);
                const pct    = Math.round((Number(c.revenue) / maxRev) * 100);
                return (
                  <motion.div
                    key={c.city}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.05, ease: EASE_OUT }}
                    className="flex items-center gap-3"
                  >
                    <span className="text-zinc-600 text-xs w-5 text-right shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-zinc-200 text-sm truncate">{c.city}</span>
                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <span className="text-zinc-500 text-xs">{c.orders} ped.</span>
                          <span className="text-white font-bold text-sm">{formatShort(Number(c.revenue))}</span>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-700 bg-brand-green"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Separador Exportar ──────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-zinc-500 text-xs font-medium px-2">Exportar</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <div className="card">
          <p className="text-zinc-500 text-sm mb-4">
            Descarga el reporte completo de pedidos y ventas para el período seleccionado.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => downloadReport("excel")}
              disabled={loadingExport.excel}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-green hover:bg-[#b0f020] active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed text-black text-sm font-semibold transition-all duration-150 cursor-pointer"
            >
              <ArrowDownTrayIcon className="w-4 h-4 shrink-0" />
              {loadingExport.excel ? "Generando..." : "Exportar Excel"}
            </button>
            <button
              onClick={() => downloadReport("pdf")}
              disabled={loadingExport.pdf}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium border border-zinc-700 hover:border-zinc-500 transition-all duration-150 cursor-pointer"
            >
              <ArrowDownTrayIcon className="w-4 h-4 shrink-0" />
              {loadingExport.pdf ? "Generando..." : "Exportar PDF"}
            </button>
          </div>
        </div>
      </motion.div>

    </motion.div>
  );
}
