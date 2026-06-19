import { useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const METRICS = [
  { key: "facturado", label: "Total facturado", color: "#c5ff3a" },
  { key: "recaudado", label: "Recaudado",       color: "#98f909" },
  { key: "pendiente", label: "Pendiente",       color: "#eab308" },
];

const fmtShort = (v) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toLocaleString("es-CO", { maximumFractionDigits: 0 })}K`;
  return `$${n}`;
};
const fmtFull = (v) => `$${Number(v || 0).toLocaleString("es-CO")}`;

function CustomTooltip({ active, payload, label, color }) {
  if (!active || !payload?.length) return null;
  const actual   = payload.find((p) => p.dataKey === "actual")?.value ?? 0;
  const anterior = payload.find((p) => p.dataKey === "anterior")?.value ?? 0;
  return (
    <div style={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, padding: "8px 11px", fontSize: 12 }}>
      <p style={{ color: "#a1a1aa", marginBottom: 4 }}>Día {label}</p>
      <p style={{ color, fontWeight: 600 }}>Este mes: {fmtFull(actual)}</p>
      <p style={{ color: "#71717a" }}>Mes anterior: {fmtFull(anterior)}</p>
    </div>
  );
}

/**
 * Gráfica de área comparativa: serie diaria del mes actual vs mes anterior.
 * Props:
 *   data – { current: [{day, facturado, recaudado, pendiente}], previous: [...] }
 */
export default function DailyComparisonChart({ data }) {
  const [metric, setMetric] = useState("facturado");
  const meta = METRICS.find((m) => m.key === metric);

  const chartData = useMemo(() => {
    const current  = data?.current  ?? [];
    const previous = data?.previous ?? [];
    return current.map((c) => {
      const prev = previous.find((p) => p.day === c.day);
      return {
        day: c.day,
        actual:   Number(c[metric]) || 0,
        anterior: prev ? Number(prev[metric]) || 0 : 0,
      };
    });
  }, [data, metric]);

  const totalActual = useMemo(
    () => (data?.current ?? []).reduce((s, c) => s + (Number(c[metric]) || 0), 0),
    [data, metric]
  );

  return (
    <div className="card">
      {/* Header: selector de métrica + total */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap
                  ${metric === m.key ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {/* Leyenda */}
          <div className="hidden sm:flex items-center gap-3 ml-1">
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} /> Este mes
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" /> Mes anterior
            </span>
          </div>
        </div>
        <span className="text-xl font-bold tabular-nums" style={{ color: metric === "recaudado" ? "#ffffff" : meta.color }}>{fmtFull(totalActual)}</span>
      </div>

      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={meta.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={meta.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="day" stroke="#52525b" fontSize={11} tickLine={false} axisLine={{ stroke: "#27272a" }} interval="preserveStartEnd" minTickGap={18} />
            <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmtShort} width={48} />
            <Tooltip content={<CustomTooltip color={meta.color} />} />
            {/* Mes anterior — gris, detrás */}
            <Area type="monotone" dataKey="anterior" stroke="#71717a" strokeWidth={1.5} fill="#3f3f46" fillOpacity={0.18}
              isAnimationActive animationDuration={700} animationEasing="ease-out" dot={false} />
            {/* Mes actual — color, encima */}
            <Area type="monotone" dataKey="actual" stroke={meta.color} strokeWidth={2.5} fill="url(#gradActual)"
              isAnimationActive animationDuration={800} animationEasing="ease-out" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
