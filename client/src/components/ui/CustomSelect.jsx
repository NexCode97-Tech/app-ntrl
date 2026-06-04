import { useState, useRef, useEffect } from "react";
import React from "react";

/**
 * CustomSelect — reemplaza <select className="input-field"> en toda la app.
 * API compatible: value, onChange (recibe { target: { value } }), disabled, className, children (<option>).
 */
export default function CustomSelect({
  value,
  onChange,
  disabled = false,
  className = "",
  children,
  placeholder,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Aplanar children (incluye arrays de .map()) en lista de opciones
  const options = [];
  React.Children.forEach(children, (child) => {
    if (!child) return;
    if (child.type === "option") {
      options.push({
        value: String(child.props.value ?? ""),
        label: child.props.children,
        disabled: child.props.disabled ?? false,
      });
    }
  });

  const selected = options.find((o) => String(o.value) === String(value ?? ""));

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open]);

  function select(val) {
    onChange?.({ target: { value: val } });
    setOpen(false);
  }

  const isPlaceholder = !selected || selected.value === "";

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`
          w-full flex items-center justify-between gap-2 text-left
          bg-zinc-900 border rounded-lg px-3 py-2 text-sm
          transition-colors duration-150 outline-none
          ${open
            ? "border-brand-green ring-1 ring-brand-green"
            : "border-zinc-700 hover:border-zinc-500"
          }
          ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        <span className={`truncate ${isPlaceholder ? "text-zinc-500" : "text-white"}`}>
          {selected?.label ?? placeholder ?? "Seleccionar..."}
        </span>
        {/* Chevron */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12" height="12"
          viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 text-zinc-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[200] w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden">
          <div className="max-h-56 overflow-y-auto custom-scrollbar">
            {options.map((opt, i) => {
              const isSelected = String(opt.value) === String(value ?? "");
              return (
                <button
                  key={`${opt.value}-${i}`}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => !opt.disabled && select(opt.value)}
                  className={`
                    w-full text-left px-3 py-2.5 text-sm transition-colors duration-100
                    ${opt.disabled ? "opacity-40 cursor-not-allowed text-zinc-500" : ""}
                    ${isSelected && !opt.disabled
                      ? "bg-brand-green/15 text-brand-green font-medium"
                      : !opt.disabled
                      ? "text-zinc-300 hover:bg-zinc-700 hover:text-white"
                      : ""
                    }
                  `}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
