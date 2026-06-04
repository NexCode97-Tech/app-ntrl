import { useState, useRef, useEffect } from "react";
import { HexColorPicker } from "react-colorful";

const PALETTE = [
  { name: "Blanco",   hex: "#FFFFFF" },
  { name: "Negro",    hex: "#111111" },
  { name: "Azul",     hex: "#2563EB" },
  { name: "Rojo",     hex: "#DC2626" },
  { name: "Amarillo", hex: "#EAB308" },
];

export default function ColorPicker({ value, onChange }) {
  const [open, setOpen]       = useState(false);
  const [hexInput, setHexInput] = useState("");
  const ref = useRef(null);

  const selected  = PALETTE.find((c) => c.name === value);
  const isHex     = value?.startsWith("#");
  const activeHex = selected ? selected.hex : isHex ? value : "#AAAAAA";

  // Sincronizar input de hex con el valor activo
  useEffect(() => {
    setHexInput(activeHex.replace("#", "").toUpperCase());
  }, [activeHex]);

  // Cerrar al clic fuera
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function handleHexInput(e) {
    const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
    setHexInput(raw.toUpperCase());
    if (raw.length === 6) onChange("#" + raw);
  }

  function handlePickerChange(hex) {
    // Deseleccionar preset si el usuario mueve el picker
    onChange(hex);
  }

  return (
    <div ref={ref} className="relative">
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
              style={{ backgroundColor: activeHex }}
            />
            <span className="text-white text-sm truncate">
              {selected ? selected.name : value}
            </span>
          </>
        ) : (
          <span className="text-zinc-500 text-sm">Sin color</span>
        )}
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="ml-auto shrink-0 text-zinc-500">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-4 w-64">

          {/* Presets */}
          <div className="flex items-center gap-2 mb-4">
            {PALETTE.map((c) => {
              const isSelected = value === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  title={c.name}
                  onClick={() => onChange(c.name)}
                  className="shrink-0 transition-transform hover:scale-110 focus:outline-none"
                >
                  <span
                    className="block rounded-full"
                    style={{
                      width: 28, height: 28,
                      backgroundColor: c.hex,
                      border: isSelected
                        ? "2.5px solid #C5FF3A"
                        : c.hex === "#FFFFFF" ? "1.5px solid #52525b" : "2px solid transparent",
                    }}
                  >
                    {isSelected && (
                      <svg viewBox="0 0 24 24" fill="none"
                        stroke={c.hex === "#FFFFFF" ? "#000" : "#fff"}
                        strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ width: 12, height: 12, margin: "auto", display: "block", marginTop: 6 }}
                      >
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* react-colorful picker */}
          <div className="color-picker-wrapper">
            <HexColorPicker
              color={activeHex}
              onChange={handlePickerChange}
              style={{ width: "100%", height: 160 }}
            />
          </div>

          {/* Input hex + preview */}
          <div className="flex items-center gap-2 mt-3">
            <span
              className="w-8 h-8 rounded-lg border border-zinc-600 shrink-0"
              style={{ backgroundColor: activeHex }}
            />
            <div className="flex items-center flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 focus-within:border-brand-green transition-colors">
              <span className="text-zinc-500 text-sm mr-1">#</span>
              <input
                className="flex-1 bg-transparent text-white text-sm outline-none uppercase tracking-wider w-full"
                maxLength={6}
                value={hexInput}
                onChange={handleHexInput}
                placeholder="FFFFFF"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3">
            {value && (
              <button type="button" onClick={() => { onChange(""); }}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors">
                Quitar color
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)}
              className="text-xs bg-brand-green text-black font-medium px-3 py-1 rounded-lg ml-auto hover:bg-brand-green/90 transition-colors">
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
