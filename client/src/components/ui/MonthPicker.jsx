import { useState, useRef, useEffect } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth,
         startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay,
         isWithinInterval, isAfter, isBefore } from "date-fns";
import { es } from "date-fns/locale";

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

/**
 * MonthPicker con selección opcional de rango de días dentro del mes
 *
 * Props:
 *   value          – "YYYY-MM" | null
 *   currentMonth   – "YYYY-MM"
 *   availableMonths – ["YYYY-MM", ...]
 *   dateRange      – { start: Date, end: Date } | null
 *   onChange       – (month: string | null, range: { start, end } | null) => void
 */
export default function MonthPicker({ value, currentMonth, availableMonths = [], dateRange, onChange, alignRight = false }) {
  const [open,     setOpen]     = useState(false);
  const [step,     setStep]     = useState("month"); // "month" | "days"
  const [viewYear, setViewYear] = useState(() => {
    const m = value ?? currentMonth;
    return m ? parseInt(m.split("-")[0]) : new Date().getFullYear();
  });
  // Estado interno del calendario de días
  const [calBase,    setCalBase]    = useState(null);   // Date base para el mini-calendario
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd,   setRangeEnd]   = useState(null);
  const [hoverDay,   setHoverDay]   = useState(null);
  const ref = useRef(null);

  // Cerrar al clic fuera
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setStep("month"); } }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Sincronizar año de vista
  useEffect(() => {
    const m = value ?? currentMonth;
    if (m) setViewYear(parseInt(m.split("-")[0]));
  }, [value, currentMonth]);

  // Sincronizar rango externo
  useEffect(() => {
    if (dateRange) { setRangeStart(dateRange.start); setRangeEnd(dateRange.end); }
    else           { setRangeStart(null); setRangeEnd(null); }
  }, [dateRange]);

  const selected = value ?? currentMonth;

  function isAvailable(monthKey) {
    return monthKey === currentMonth || availableMonths.includes(monthKey);
  }

  function handleSelectMonth(monthKey) {
    const isCurrentMonth = monthKey === currentMonth;
    const newMonth = isCurrentMonth ? null : monthKey;
    onChange(newMonth, null); // reseta el rango al cambiar mes
    setRangeStart(null); setRangeEnd(null);
    // Abrir el calendario de días
    const [y, m] = (monthKey).split("-").map(Number);
    setCalBase(new Date(y, m - 1, 1));
    setStep("days");
  }

  function handleDayClick(day) {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      // Iniciar nueva selección
      setRangeStart(day);
      setRangeEnd(null);
      setHoverDay(null);
    } else {
      // Completar rango
      const [s, e] = isAfter(day, rangeStart) ? [rangeStart, day] : [day, rangeStart];
      setRangeStart(s);
      setRangeEnd(e);
      onChange(value, { start: s, end: e });
    }
  }

  function handleClearRange() {
    setRangeStart(null);
    setRangeEnd(null);
    onChange(value, null);
  }

  // ── Generar días del mini-calendario ─────────────────────────
  function buildDays(base) {
    if (!base) return [];
    const start = startOfWeek(startOfMonth(base), { weekStartsOn: 1 });
    const end   = endOfWeek(endOfMonth(base),     { weekStartsOn: 1 });
    const days  = [];
    let d = start;
    while (!isAfter(d, end)) { days.push(d); d = addDays(d, 1); }
    return days;
  }

  const calDays = buildDays(calBase);

  function isDayInRange(day) {
    const e = rangeEnd ?? (hoverDay && rangeStart && !rangeEnd ? hoverDay : null);
    if (!rangeStart || !e) return false;
    const [s, en] = isAfter(e, rangeStart) ? [rangeStart, e] : [e, rangeStart];
    return isWithinInterval(day, { start: s, end: en });
  }

  // ── Label del botón trigger ───────────────────────────────────
  const labelDate = selected ? new Date(selected + "-15") : new Date();
  const monthLabel = format(labelDate, "MMM yyyy", { locale: es });

  let triggerLabel = monthLabel;
  if (value === null) triggerLabel = monthLabel;
  if (dateRange?.start && dateRange?.end) {
    const s = format(dateRange.start, "d MMM", { locale: es });
    const e = format(dateRange.end,   "d MMM", { locale: es });
    triggerLabel = `${monthLabel} · ${s}–${e}`;
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-white text-xs rounded-lg px-3 py-1.5 transition-colors focus:outline-none focus:border-brand-green"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span className="hidden sm:inline capitalize">{triggerLabel}</span>
        {value === null && !dateRange && <span className="hidden sm:inline text-zinc-400">(actual)</span>}
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`hidden sm:block transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Popover */}
      {open && (
        <div className={`absolute top-10 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-4 w-72 ${alignRight ? "right-0" : "left-0"}`}>

          {/* ── PASO 1: Selección de mes ────────────────────── */}
          {step === "month" && (
            <>
              {/* Nav de año */}
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setViewYear(y => y - 1)} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <span className="text-white text-sm font-semibold">{viewYear}</span>
                <button onClick={() => setViewYear(y => y + 1)} disabled={viewYear >= new Date().getFullYear()} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>

              {/* Grid de meses */}
              <div className="grid grid-cols-4 gap-1.5">
                {MONTHS.map((name, i) => {
                  const monthKey = `${viewYear}-${String(i + 1).padStart(2, "0")}`;
                  const isSelected = selected === monthKey;
                  const isCurrent  = monthKey === currentMonth;
                  const available  = isAvailable(monthKey);
                  return (
                    <button
                      key={monthKey}
                      onClick={() => available && handleSelectMonth(monthKey)}
                      disabled={!available}
                      className={`h-9 rounded-lg text-xs font-medium transition-all duration-150
                        ${isSelected ? "bg-brand-green text-black shadow-[0_0_0_2px_rgba(197,255,58,0.3)]"
                          : isCurrent && !isSelected ? "bg-zinc-700 text-white ring-1 ring-brand-green/40"
                          : available ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                          : "bg-zinc-900 text-zinc-600 cursor-not-allowed"}`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>

              {/* Botón mes actual */}
              {value !== null && (
                <button onClick={() => { onChange(null, null); setOpen(false); }} className="mt-3 w-full text-xs text-zinc-400 hover:text-brand-green transition-colors py-1">
                  → Ir al mes actual
                </button>
              )}
            </>
          )}

          {/* ── PASO 2: Selección de rango de días ─────────── */}
          {step === "days" && calBase && (
            <>
              {/* Header con back + mes */}
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setStep("month")} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <span className="text-white text-sm font-semibold capitalize">
                  {format(calBase, "MMMM yyyy", { locale: es })}
                </span>
                <div className="flex gap-0.5">
                  <button onClick={() => setCalBase(b => subMonths(b, 1))} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <button onClick={() => setCalBase(b => addMonths(b, 1))} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              </div>

              {/* Días de la semana */}
              <div className="grid grid-cols-7 text-center text-[10px] text-zinc-500 uppercase mb-1.5">
                {["Lu","Ma","Mi","Ju","Vi","Sa","Do"].map(d => <div key={d}>{d}</div>)}
              </div>

              {/* Grid de días */}
              <div className="grid grid-cols-7 gap-y-1">
                {calDays.map((day, idx) => {
                  const inMonth   = isSameMonth(day, calBase);
                  const isStart   = rangeStart && isSameDay(day, rangeStart);
                  const isEnd     = rangeEnd   && isSameDay(day, rangeEnd);
                  const inRange   = isDayInRange(day);
                  return (
                    <div
                      key={idx}
                      onClick={() => inMonth && handleDayClick(day)}
                      onMouseEnter={() => { if (rangeStart && !rangeEnd) setHoverDay(day); }}
                      onMouseLeave={() => setHoverDay(null)}
                      className={`h-8 flex items-center justify-center text-xs transition-all
                        ${!inMonth ? "opacity-0 pointer-events-none" : "cursor-pointer"}
                        ${isStart ? "bg-brand-green text-black font-bold rounded-l-lg rounded-r-none" : ""}
                        ${isEnd   ? "bg-brand-green text-black font-bold rounded-r-lg rounded-l-none" : ""}
                        ${inRange && !isStart && !isEnd ? "bg-brand-green/20 text-white rounded-none" : ""}
                        ${inMonth && !isStart && !isEnd && !inRange ? "text-zinc-300 hover:bg-zinc-700 hover:rounded-lg" : ""}
                      `}
                    >
                      {format(day, "d")}
                    </div>
                  );
                })}
              </div>

              {/* Acciones del rango */}
              <div className="mt-3 flex items-center justify-between">
                {rangeStart && !rangeEnd && (
                  <p className="text-zinc-400 text-xs">Selecciona el día final</p>
                )}
                {rangeStart && rangeEnd && (
                  <p className="text-brand-green text-xs font-medium">
                    {format(rangeStart, "d MMM", { locale: es })} – {format(rangeEnd, "d MMM", { locale: es })}
                  </p>
                )}
                {!rangeStart && <p className="text-zinc-500 text-xs">Selecciona un día inicial</p>}
                <div className="flex gap-2 ml-auto">
                  {(rangeStart || rangeEnd) && (
                    <button onClick={handleClearRange} className="text-xs text-zinc-400 hover:text-red-400 transition-colors">Limpiar</button>
                  )}
                  {rangeStart && rangeEnd && (
                    <button onClick={() => setOpen(false)} className="text-xs bg-brand-green text-black px-2.5 py-1 rounded-lg font-medium hover:bg-brand-green/90 transition-colors">
                      Aplicar
                    </button>
                  )}
                </div>
              </div>

              {/* Todo el mes */}
              <button
                onClick={() => {
                  setRangeStart(null); setRangeEnd(null);
                  onChange(value, null);
                  setOpen(false);
                }}
                className="mt-2 w-full text-xs text-zinc-400 hover:text-brand-green transition-colors py-1"
              >
                Ver todo el mes
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
