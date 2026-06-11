import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../config/api.js";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const DAY_NAMES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];
const MAX_PER_DAY = 3;
const ACTIVE_STATUSES = ["pending", "in_progress", "ready", "delivered"];

function padDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const DOT_COLORS = {
  pending:     "bg-yellow-400",
  in_progress: "bg-blue-400",
  ready:       "bg-brand-green",
  delivered:   "bg-zinc-400",
};

export default function DeliveryDatePicker({ value, onChange, orderId }) {
  const [open, setOpen]       = useState(false);
  const today                 = new Date();
  const [viewYear,  setViewYear]  = useState(value ? parseInt(value.slice(0, 4)) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(value ? parseInt(value.slice(5, 7)) - 1 : today.getMonth());
  const ref = useRef(null);

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;

  const { data: orders = [] } = useQuery({
    queryKey: ["calendar", monthStr],
    queryFn:  () => api.get(`/orders/calendar?month=${monthStr}`).then((r) => r.data.data),
    enabled:  open,
  });

  const ordersByDay = {};
  orders.forEach((o) => {
    if (!ACTIVE_STATUSES.includes(o.status)) return;
    if (orderId && o.id === orderId) return;
    const day = o.delivery_date?.slice(0, 10);
    if (!day) return;
    if (!ordersByDay[day]) ordersByDay[day] = [];
    ordersByDay[day].push(o);
  });

  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const offset = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const cells = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function handleSelectDay(day) {
    const str = padDate(viewYear, viewMonth, day);
    if ((ordersByDay[str] ?? []).length >= MAX_PER_DAY) return;
    onChange(str);
    setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const triggerLabel = value
    ? format(new Date(value + "T12:00:00"), "d 'de' MMMM yyyy", { locale: es })
    : "Seleccionar fecha";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="input-field flex items-center gap-2 text-left cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-zinc-400 shrink-0">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span className={`flex-1 ${value ? "text-white" : "text-zinc-500"}`}>{triggerLabel}</span>
        {value && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
          >
            ✕
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-4">

          {/* Nav mes */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span className="text-white text-sm font-semibold capitalize">
              {format(new Date(viewYear, viewMonth, 1), "MMMM yyyy", { locale: es })}
            </span>
            <button type="button" onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          {/* Nombres días */}
          <div className="grid grid-cols-7 text-center text-[10px] text-zinc-500 uppercase mb-1.5">
            {DAY_NAMES.map((d) => <div key={d}>{d}</div>)}
          </div>

          {/* Grid días */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} />;
              const str       = padDate(viewYear, viewMonth, day);
              const dayOrders = ordersByDay[str] ?? [];
              const count     = dayOrders.length;
              const full      = count >= MAX_PER_DAY;
              const isSelected = str === value;
              const isToday    = str === padDate(today.getFullYear(), today.getMonth(), today.getDate());

              return (
                <div
                  key={str}
                  onClick={() => !full && handleSelectDay(day)}
                  className={`
                    flex flex-col items-center py-1.5 rounded-lg transition-all min-h-[44px]
                    ${full
                      ? "bg-red-950/30 cursor-not-allowed"
                      : isSelected
                        ? "bg-brand-green cursor-pointer"
                        : isToday
                          ? "bg-zinc-700 cursor-pointer hover:bg-zinc-600"
                          : "cursor-pointer hover:bg-zinc-800"}
                  `}
                  title={full ? "Fecha completa (3/3 pedidos)" : undefined}
                >
                  <span className={`text-xs font-medium leading-none
                    ${full ? "text-red-400" : isSelected ? "text-black" : isToday ? "text-white" : "text-zinc-300"}`}>
                    {day}
                  </span>

                  {count > 0 && (
                    <div className="flex gap-0.5 mt-1 justify-center flex-wrap">
                      {dayOrders.slice(0, 3).map((o, i) => (
                        <span key={i}
                          className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-black/60" : (DOT_COLORS[o.status] ?? "bg-zinc-400")}`}
                        />
                      ))}
                    </div>
                  )}

                  {full && (
                    <span className="text-[9px] text-red-400 leading-none mt-0.5">lleno</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Leyenda */}
          <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-[10px] text-zinc-500">Pendiente</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-[10px] text-zinc-500">En proceso</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-green" />
              <span className="text-[10px] text-zinc-500">Listo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] text-zinc-500">Lleno (3/3)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
