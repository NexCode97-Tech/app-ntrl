# Delivery Date Picker con límite de 3 pedidos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el `input type="date"` nativo en creación/edición de pedidos por un DatePicker custom que muestre puntos por día (igual que CalendarPage) y bloquee fechas con 3+ pedidos. También actualizar CalendarPage para mostrar el conteo de ocupación.

**Architecture:** Se crea un componente `DeliveryDatePicker` que reutiliza la misma query `GET /orders/calendar?month=` ya existente para obtener los pedidos por mes. Al cambiar de mes en el picker se recarga la query. Las fechas con 3+ pedidos activos (no cancelados) se deshabilitan visualmente y no son seleccionables. CalendarPage ya consume `ordersByDay` — solo hay que agregar el indicador de ocupación en cada celda.

**Tech Stack:** React, TanStack Query v5, date-fns, Tailwind CSS, API REST existente (`/orders/calendar`)

---

## Archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| `client/src/components/ui/DeliveryDatePicker.jsx` | CREAR — picker custom con grid de días, puntos de ocupación, bloqueo en ≥3 |
| `client/src/pages/admin/OrderCreatePage.jsx` | MODIFICAR — reemplazar `input type="date"` por `DeliveryDatePicker` |
| `client/src/pages/admin/OrderDetailPage.jsx` | MODIFICAR — reemplazar `input type="date"` por `DeliveryDatePicker` |
| `client/src/pages/admin/CalendarPage.jsx` | MODIFICAR — agregar indicador de ocupación (barra o número) en celdas con pedidos |

---

## Task 1: Crear DeliveryDatePicker

**Archivo:** `client/src/components/ui/DeliveryDatePicker.jsx`

Este componente muestra un botón trigger con la fecha seleccionada. Al hacer clic abre un popover con un mini-calendario mensual. Cada día muestra puntos de color por pedido (igual que CalendarPage). Fechas con 3+ pedidos activos aparecen en rojo y no son clickeables.

- [ ] **Crear el archivo** `client/src/components/ui/DeliveryDatePicker.jsx` con el siguiente contenido:

```jsx
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../config/api.js";
import { format, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";

const DAY_NAMES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];
const MAX_PER_DAY = 3;

// Pedidos cancelados no cuentan para el límite
const ACTIVE_STATUSES = ["pending", "in_progress", "ready", "delivered"];

function padDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Puntos de color por estado (igual que CalendarPage)
const DOT_COLORS = {
  pending:     "bg-yellow-400",
  in_progress: "bg-blue-400",
  ready:       "bg-brand-green",
  delivered:   "bg-zinc-400",
};

/**
 * Props:
 *   value      – "YYYY-MM-DD" | ""
 *   onChange   – (value: string) => void
 *   orderId    – UUID del pedido actual (para excluirlo del conteo al editar)
 */
export default function DeliveryDatePicker({ value, onChange, orderId }) {
  const [open, setOpen]   = useState(false);
  const today             = new Date();
  const [viewYear,  setViewYear]  = useState(value ? parseInt(value.slice(0, 4)) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(value ? parseInt(value.slice(5, 7)) - 1 : today.getMonth());
  const ref = useRef(null);

  // Cerrar al clic fuera
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

  // Mapa día → pedidos activos (excluir el pedido actual si se está editando)
  const ordersByDay = {};
  orders.forEach((o) => {
    if (!ACTIVE_STATUSES.includes(o.status)) return;
    if (orderId && o.id === orderId) return;
    const day = o.delivery_date?.slice(0, 10);
    if (!day) return;
    if (!ordersByDay[day]) ordersByDay[day] = [];
    ordersByDay[day].push(o);
  });

  // Generar celdas del mes
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay(); // 0=Dom
  // Convertir a Lunes=0
  const offset = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const cells = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function handleSelectDay(day) {
    const str = padDate(viewYear, viewMonth, day);
    const count = (ordersByDay[str] ?? []).length;
    if (count >= MAX_PER_DAY) return; // bloqueado
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

  // Label del trigger
  const triggerLabel = value
    ? format(new Date(value + "T12:00:00"), "d 'de' MMMM yyyy", { locale: es })
    : "Seleccionar fecha";

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
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
        <span className={value ? "text-white" : "text-zinc-500"}>{triggerLabel}</span>
        {value && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="ml-auto text-zinc-500 hover:text-red-400 transition-colors"
          >
            ✕
          </button>
        )}
      </button>

      {/* Popover */}
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
              const str    = padDate(viewYear, viewMonth, day);
              const dayOrders = ordersByDay[str] ?? [];
              const count  = dayOrders.length;
              const full   = count >= MAX_PER_DAY;
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
                  title={full ? "Fecha completa (3 pedidos)" : undefined}
                >
                  <span className={`text-xs font-medium leading-none
                    ${full ? "text-red-400" : isSelected ? "text-black" : isToday ? "text-white" : "text-zinc-300"}`}>
                    {day}
                  </span>

                  {/* Puntos de ocupación */}
                  {count > 0 && (
                    <div className="flex gap-0.5 mt-1 justify-center flex-wrap">
                      {dayOrders.slice(0, 3).map((o, i) => (
                        <span key={i}
                          className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-black/60" : (DOT_COLORS[o.status] ?? "bg-zinc-400")}`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Badge "lleno" */}
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
```

- [ ] **Commit**
```bash
git add client/src/components/ui/DeliveryDatePicker.jsx
git commit -m "feat: crear DeliveryDatePicker con puntos de ocupación y límite 3 pedidos/día"
```

---

## Task 2: Reemplazar input en OrderCreatePage

**Archivo:** `client/src/pages/admin/OrderCreatePage.jsx`

- [ ] **Agregar el import** al inicio del archivo, junto a los otros imports de componentes UI:
```jsx
import DeliveryDatePicker from "../../components/ui/DeliveryDatePicker.jsx";
```

- [ ] **Reemplazar el input nativo** (línea ~204):

Buscar:
```jsx
<input type="date" className="input-field" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
```

Reemplazar por:
```jsx
<DeliveryDatePicker value={deliveryDate} onChange={setDeliveryDate} />
```

- [ ] **Commit**
```bash
git add client/src/pages/admin/OrderCreatePage.jsx
git commit -m "feat: usar DeliveryDatePicker en formulario de creación de pedido"
```

---

## Task 3: Reemplazar input en OrderDetailPage

**Archivo:** `client/src/pages/admin/OrderDetailPage.jsx`

- [ ] **Agregar el import**:
```jsx
import DeliveryDatePicker from "../../components/ui/DeliveryDatePicker.jsx";
```

- [ ] **Reemplazar el input nativo** (línea ~944). Buscar:
```jsx
<input type="date" className="input-field" value={deliveryDate}
  onChange={(e) => setDeliveryDate(e.target.value)} />
```

Reemplazar por (pasando `orderId` para excluir el pedido actual del conteo):
```jsx
<DeliveryDatePicker value={deliveryDate} onChange={setDeliveryDate} orderId={order.id} />
```

- [ ] **Commit**
```bash
git add client/src/pages/admin/OrderDetailPage.jsx
git commit -m "feat: usar DeliveryDatePicker en edición de pedido, excluyendo pedido actual del conteo"
```

---

## Task 4: Indicador de ocupación en CalendarPage

**Archivo:** `client/src/pages/admin/CalendarPage.jsx`

Agregar en cada celda del `DayGrid` un indicador de cuántos pedidos hay vs el límite (ej: `2/3`), y colorear la celda diferente cuando está llena.

- [ ] **Modificar `DayGrid`** para recibir y mostrar el indicador de ocupación. Buscar la función `DayGrid`:

```jsx
function DayGrid({ days, ordersByDay, selectedDay, onSelect, today, holidays }) {
```

Reemplazar por:
```jsx
const MAX_PER_DAY = 3;
const ACTIVE_STATUSES = new Set(["pending", "in_progress", "ready", "delivered"]);

function DayGrid({ days, ordersByDay, selectedDay, onSelect, today, holidays }) {
```

- [ ] **Modificar el cuerpo de cada celda** dentro de `DayGrid`. Buscar el bloque que empieza con:
```jsx
const orders     = ordersByDay[cell.str] ?? [];
const isToday    = cell.str === today;
const isSelected = cell.str === selectedDay;
const holiday    = holidays[cell.str];
```

Reemplazar por:
```jsx
const orders      = ordersByDay[cell.str] ?? [];
const activeCount = orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length;
const isFull      = activeCount >= MAX_PER_DAY;
const isToday     = cell.str === today;
const isSelected  = cell.str === selectedDay;
const holiday     = holidays[cell.str];
```

- [ ] **Actualizar las clases del botón** dentro del `.map`. Buscar:
```jsx
className={`
  relative flex flex-col items-center py-2 px-1 rounded-lg transition-colors text-sm min-h-[52px]
  ${isSelected ? "bg-brand-green text-black"
    : isToday  ? "bg-zinc-700 text-white"
    : holiday  ? "bg-red-950/40 hover:bg-red-950/60 text-red-300"
    : orders.length ? "hover:bg-zinc-800 text-white"
    : "hover:bg-zinc-800/50 text-zinc-500"}
`}
```

Reemplazar por:
```jsx
className={`
  relative flex flex-col items-center py-2 px-1 rounded-lg transition-colors text-sm min-h-[52px]
  ${isSelected ? "bg-brand-green text-black"
    : isFull   ? "bg-red-950/40 hover:bg-red-950/50 text-red-300"
    : isToday  ? "bg-zinc-700 text-white"
    : holiday  ? "bg-red-950/40 hover:bg-red-950/60 text-red-300"
    : orders.length ? "hover:bg-zinc-800 text-white"
    : "hover:bg-zinc-800/50 text-zinc-500"}
`}
```

- [ ] **Agregar el badge de ocupación** debajo del número del día. Buscar:
```jsx
<span className="font-medium leading-none">{cell.day}</span>
```

Reemplazar por:
```jsx
<span className="font-medium leading-none">{cell.day}</span>
{activeCount > 0 && (
  <span className={`text-[9px] font-medium leading-none mt-0.5
    ${isFull
      ? (isSelected ? "text-black/70" : "text-red-400")
      : (isSelected ? "text-black/70" : "text-zinc-500")}`}>
    {activeCount}/{MAX_PER_DAY}
  </span>
)}
```

- [ ] **Actualizar la leyenda** al final de `CalendarPage` para agregar el indicador de "lleno". Buscar:
```jsx
<div className="flex items-center gap-1.5">
  <span className="w-2 h-2 rounded-full bg-red-400" />
  <span className="text-xs text-zinc-500">Festivo</span>
</div>
```

Agregar después:
```jsx
<div className="flex items-center gap-1.5">
  <span className="text-xs font-bold text-red-400">3/3</span>
  <span className="text-xs text-zinc-500">Fecha llena</span>
</div>
```

- [ ] **Commit**
```bash
git add client/src/pages/admin/CalendarPage.jsx
git commit -m "feat: mostrar contador de ocupación por día en CalendarPage (N/3)"
```

---

## Task 5: Push y verificación

- [ ] **Push a producción**
```bash
git push origin main
```

- [ ] **Verificar en la app:**
  1. Crear un pedido → el selector de fecha muestra el calendario con puntos
  2. Una fecha con 3 pedidos aparece en rojo con texto "lleno" y no es clickeable
  3. Editar un pedido → el picker no cuenta el propio pedido (no bloquea su fecha actual si tiene ≤3 contando él mismo)
  4. CalendarPage → cada día con pedidos muestra `1/3`, `2/3`, `3/3` — los llenos en rojo
