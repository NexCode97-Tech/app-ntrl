import { useState, useRef, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import { useAuthStore } from "../../stores/authStore.js";

const PALETTE = [
  { name: "Blanco",   hex: "#FFFFFF" },
  { name: "Negro",    hex: "#111111" },
  { name: "Azul",     hex: "#2563EB" },
  { name: "Rojo",     hex: "#DC2626" },
  { name: "Amarillo", hex: "#EAB308" },
];

const MAX_RECENT = 8;

function getRecentKey(userId) {
  return `ntrl_recent_colors_${userId}`;
}

function loadRecent(userId) {
  if (!userId) return [];
  try { return JSON.parse(localStorage.getItem(getRecentKey(userId))) ?? []; }
  catch { return []; }
}

function saveRecent(userId, hex) {
  if (!userId || !hex) return;
  const prev = loadRecent(userId).filter((c) => c.toLowerCase() !== hex.toLowerCase());
  const next = [hex, ...prev].slice(0, MAX_RECENT);
  localStorage.setItem(getRecentKey(userId), JSON.stringify(next));
}

export default function ColorPicker({ value, onChange }) {
  const user      = useAuthStore((s) => s.user);
  const [open, setOpen]         = useState(false);
  const [hexInput, setHexInput] = useState("");
  const [openUp, setOpenUp]     = useState(false);
  const [recent, setRecent]     = useState([]);
  const ref        = useRef(null);
  const triggerRef = useRef(null);

  const selected  = PALETTE.find((c) => c.name === value);
  const isHex     = value?.startsWith("#");
  const activeHex = selected ? selected.hex : isHex ? value : "#AAAAAA";

  // Cargar recientes cuando abre
  useEffect(() => {
    if (open) setRecent(loadRecent(user?.id));
  }, [open, user?.id]);

  // Sincronizar hex input
  useEffect(() => {
    setHexInput(activeHex.replace("#", "").toUpperCase());
  }, [activeHex]);

  // Detectar si abrir hacia arriba o abajo
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect         = triggerRef.current.getBoundingClientRect();
    const dropdownH    = recent.length > 0 ? 420 : 380; // estimado
    const spaceBelow   = window.innerHeight - rect.bottom;
    setOpenUp(spaceBelow < dropdownH && rect.top > dropdownH);
  }, [open, recent.length]);

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

  function handleApply() {
    if (value) {
      const hex = selected ? selected.hex : isHex ? value : null;
      if (hex) {
        saveRecent(user?.id, hex);
        setRecent(loadRecent(user?.id));
      }
    }
    setOpen(false);
  }

  function handleSelectRecent(hex) {
    onChange(hex);
    setHexInput(hex.replace("#", "").toUpperCase());
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
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
        <div
          className={`absolute left-0 z-[200] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-4 w-64
            ${openUp ? "bottom-full mb-1" : "top-full mt-1"}`}
        >
          {/* Presets */}
          <div className="flex items-center gap-2 mb-3">
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

          {/* Colores recientes */}
          {recent.length > 0 && (
            <div className="mb-3">
              <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-1.5">Recientes</p>
              <div className="flex flex-wrap gap-1.5">
                {recent.map((hex) => {
                  const isSelected = value === hex;
                  return (
                    <button
                      key={hex}
                      type="button"
                      title={hex}
                      onClick={() => handleSelectRecent(hex)}
                      className="shrink-0 transition-transform hover:scale-110 focus:outline-none"
                    >
                      <span
                        className="block rounded-full"
                        style={{
                          width: 22, height: 22,
                          backgroundColor: hex,
                          border: isSelected ? "2px solid #C5FF3A" : "1.5px solid #52525b",
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* react-colorful picker */}
          <div className="color-picker-wrapper">
            <HexColorPicker
              color={activeHex}
              onChange={onChange}
              style={{ width: "100%", height: 150 }}
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
              <button type="button" onClick={() => { onChange(""); setOpen(false); }}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors">
                Quitar color
              </button>
            )}
            <button type="button" onClick={handleApply}
              className="text-xs bg-brand-green text-black font-medium px-3 py-1 rounded-lg ml-auto hover:bg-brand-green/90 transition-colors">
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
