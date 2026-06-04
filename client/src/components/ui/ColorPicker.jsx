import { useState } from "react";

const PALETTE = [
  { name: "Blanco",   hex: "#FFFFFF" },
  { name: "Negro",    hex: "#111111" },
  { name: "Azul",     hex: "#2563EB" },
  { name: "Rojo",     hex: "#DC2626" },
  { name: "Amarillo", hex: "#EAB308" },
];

export default function ColorPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected  = PALETTE.find((c) => c.name === value);
  const isHex     = value?.startsWith("#");

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="input-field flex items-center gap-2 w-full text-left"
      >
        {(selected || isHex) ? (
          <>
            <span
              className="w-4 h-4 rounded-full shrink-0 border border-white/20"
              style={{ backgroundColor: selected ? selected.hex : value }}
            />
            <span className="text-white text-sm truncate">{selected ? selected.name : value}</span>
          </>
        ) : (
          <span className="text-zinc-500 text-sm">{value || "Sin color"}</span>
        )}
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-auto shrink-0 text-zinc-500">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-zinc-800 border border-zinc-700 rounded-xl p-3 shadow-xl w-full space-y-3">

          {/* Paleta predeterminada */}
          <div className="flex items-center gap-2">
            {PALETTE.map((c) => {
              const isSelected = value === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  title={c.name}
                  onClick={() => { onChange(c.name); setOpen(false); }}
                  className="shrink-0 transition-transform hover:scale-110 focus:outline-none"
                >
                  <span
                    className="block rounded-full"
                    style={{
                      width: 32, height: 32,
                      backgroundColor: c.hex,
                      border: isSelected
                        ? "2.5px solid #C5FF3A"
                        : c.hex === "#FFFFFF" ? "1.5px solid #52525b" : "2.5px solid transparent",
                    }}
                  >
                    {isSelected && (
                      <svg viewBox="0 0 24 24" fill="none"
                        stroke={c.hex === "#FFFFFF" ? "#000" : "#fff"}
                        strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                        style={{ width: 14, height: 14, margin: "auto", display: "block", marginTop: 7 }}
                      >
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Separador */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-zinc-700" />
            <span className="text-zinc-500 text-xs">otro color</span>
            <div className="flex-1 h-px bg-zinc-700" />
          </div>

          {/* Color picker nativo */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="color"
              className="w-8 h-8 rounded cursor-pointer"
              value={isHex ? value : "#ffffff"}
              onChange={(e) => onChange(e.target.value)}
            />
            <span className="text-zinc-400 text-xs group-hover:text-white transition-colors">
              {isHex ? value : "Abrir paleta completa"}
            </span>
          </label>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            {value && (
              <button type="button" onClick={() => onChange("")} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">
                Quitar color
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-brand-green ml-auto">
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
