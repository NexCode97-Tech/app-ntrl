import { useState, useRef, useEffect } from "react";
import { format, addYears, subYears } from "date-fns";
import { es } from "date-fns/locale";

const MONTHS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

/**
 * MonthPicker — selector de mes/año con popover
 * @param {string}   value       - mes seleccionado en formato "YYYY-MM" (null = mes actual)
 * @param {string}   currentMonth - mes actual en formato "YYYY-MM"
 * @param {string[]} availableMonths - meses disponibles ["YYYY-MM", ...]
 * @param {function} onChange    - (value: string | null) => void
 */
export default function MonthPicker({ value, currentMonth, availableMonths = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    const m = value ?? currentMonth;
    return m ? parseInt(m.split("-")[0]) : new Date().getFullYear();
  });
  const ref = useRef(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Sincronizar año de la vista cuando cambia el value externo
  useEffect(() => {
    const m = value ?? currentMonth;
    if (m) setViewYear(parseInt(m.split("-")[0]));
  }, [value, currentMonth]);

  const selected = value ?? currentMonth; // "YYYY-MM"

  function handleSelect(monthKey) {
    onChange(monthKey === currentMonth ? null : monthKey);
    setOpen(false);
  }

  function isAvailable(monthKey) {
    return monthKey === currentMonth || availableMonths.includes(monthKey);
  }

  // Etiqueta del botón
  const labelDate = selected ? new Date(selected + "-15") : new Date();
  const label = format(labelDate, "MMM yyyy", { locale: es });

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
        <span className="capitalize">{label}</span>
        {value === null && <span className="text-zinc-400">(actual)</span>}
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute top-10 left-0 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-4 w-64 animate-in fade-in slide-in-from-top-1">
          {/* Navegación de año */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setViewYear((y) => y - 1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span className="text-white text-sm font-semibold">{viewYear}</span>
            <button
              onClick={() => setViewYear((y) => y + 1)}
              disabled={viewYear >= new Date().getFullYear()}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          {/* Grid de meses */}
          <div className="grid grid-cols-4 gap-1.5">
            {MONTHS.map((name, i) => {
              const monthKey = `${viewYear}-${String(i + 1).padStart(2, "0")}`;
              const isSelected = selected === monthKey;
              const isCurrent = monthKey === currentMonth;
              const available = isAvailable(monthKey);

              return (
                <button
                  key={monthKey}
                  onClick={() => available && handleSelect(monthKey)}
                  disabled={!available}
                  className={`
                    h-9 rounded-lg text-xs font-medium transition-all duration-150
                    ${isSelected
                      ? "bg-brand-green text-black shadow-[0_0_0_2px_rgba(197,255,58,0.3)]"
                      : isCurrent && !isSelected
                      ? "bg-zinc-700 text-white ring-1 ring-brand-green/40"
                      : available
                      ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                      : "bg-zinc-900 text-zinc-600 cursor-not-allowed"
                    }
                  `}
                >
                  {name}
                </button>
              );
            })}
          </div>

          {/* Botón "Mes actual" */}
          {value !== null && (
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className="mt-3 w-full text-xs text-zinc-400 hover:text-brand-green transition-colors py-1"
            >
              → Ir al mes actual
            </button>
          )}
        </div>
      )}
    </div>
  );
}
