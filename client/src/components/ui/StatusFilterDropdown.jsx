import { useState, useRef, useEffect } from "react";

/**
 * Filtro de estado compacto multi-selección (puntos apilados + contador).
 *
 * Props:
 *   options  – [{ value, label, dot }]   estados seleccionables
 *   selected – string[]                  estados activos ([] = todos)
 *   onChange – (string[]) => void
 *   counts   – { [value]: number, "": total }   conteos opcionales
 */
export default function StatusFilterDropdown({ options, selected, onChange, counts }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const isAll = selected.length === 0;
  const activeDots = isAll
    ? options.map((o) => o.dot)
    : options.filter((o) => selected.includes(o.value)).map((o) => o.dot);

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
          {isAll ? options.length : selected.length}/{options.length}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full right-0 sm:left-0 sm:right-auto mt-2 w-60 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-1.5">
          {options.map((o) => {
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
                {counts && <span className="text-xs text-zinc-500 tabular-nums">{counts[o.value] ?? "—"}</span>}
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
            {counts && <span className="text-xs text-zinc-500 tabular-nums">{counts[""] ?? "—"}</span>}
          </button>
        </div>
      )}
    </div>
  );
}
