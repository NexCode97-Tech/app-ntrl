import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../config/api.js";
import { hardRefresh } from "../../utils/hardRefresh.js";
import { ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import ColorPicker from "../../components/ui/ColorPicker.jsx";
import CustomSelect from "../../components/ui/CustomSelect.jsx";

const STATUS_COLORS = {
  pending:     "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  in_progress: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  delivered:   "bg-brand-green/20 text-brand-green border border-brand-green/30",
};
const STATUS_LABELS = { pending: "Pendiente", in_progress: "En proceso", delivered: "Entregado" };

const UNITS = ["Unidades", "Metros", "Kg", "Litros", "Rollos", "Yardas", "Piezas", "Resma"];

export default function SuppliesWorkerPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["supplies-worker"],
    queryFn: () => api.get("/supplies").then((r) => r.data.data),
  });

  const { data: ordersData } = useQuery({
    queryKey: ["orders-simple"],
    queryFn: () => api.get("/orders?limit=50").then((r) => r.data.data),
  });

  const create = useMutation({
    mutationFn: (d) => api.post("/supplies", d),
    onSuccess: () => { qc.invalidateQueries(["supplies-worker"]); setShowForm(false); },
  });

  const markReceived = useMutation({
    mutationFn: (id) => api.put(`/supplies/${id}`, { status: "delivered" }),
    onSuccess: () => qc.invalidateQueries(["supplies-worker"]),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/supplies/${id}`),
    onSuccess: () => qc.invalidateQueries(["supplies-worker"]),
  });

  const visible = data?.filter((r) => r.status !== "delivered") ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Nueva solicitud</button>
      </div>

      {/* Lista de solicitudes */}
      <div className="space-y-3">
        {isLoading && <p className="text-zinc-500 text-center py-8 text-sm">Cargando...</p>}
        {!isLoading && visible.length === 0 && (
          <div className="card text-center py-8">
            <p className="text-zinc-500 text-sm">No tienes solicitudes de suministros.</p>
            <button className="btn-primary mt-3 text-sm" onClick={() => setShowForm(true)}>Hacer primera solicitud</button>
          </div>
        )}
        {visible.map((r) => (
          <div key={r.id} className="card flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-white font-medium">{r.item_name}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</span>
              </div>
              <p className="text-zinc-400 text-sm">{r.quantity} {r.unit}</p>
              {r.order_number && (
                <p className="text-zinc-500 text-xs mt-0.5">Pedido #{String(r.order_number).padStart(3,"0")}</p>
              )}
              {r.notes && <p className="text-zinc-600 text-xs mt-0.5 italic">"{r.notes}"</p>}
              {r.admin_notes && (
                <p className="text-blue-400 text-xs mt-1 flex items-center gap-1">
                  <ChatBubbleLeftIcon className="w-3 h-3 shrink-0" />
                  Admin: {r.admin_notes}
                </p>
              )}
              <p className="text-zinc-600 text-xs mt-1">
                {new Date(r.created_at).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" })}
              </p>
            </div>
            <div className="flex flex-row items-center gap-3 shrink-0">
              {(r.status === "pending" || r.status === "in_progress") && (
                <button onClick={() => { if (confirm("¿Confirmar que recibiste este suministro?")) markReceived.mutate(r.id); }}
                  className="text-brand-green hover:text-brand-green/70 text-xs transition-colors">
                  Recibido
                </button>
              )}
              {r.status === "pending" && (
                <button onClick={() => { if (confirm("¿Cancelar esta solicitud?")) remove.mutate(r.id); }}
                  className="text-zinc-600 hover:text-red-400 text-xs transition-colors">
                  Cancelar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal nueva solicitud */}
      {showForm && (
        <RequestForm
          orders={ordersData ?? []}
          onSave={(d) => create.mutate(d)}
          onClose={() => setShowForm(false)}
          saving={create.isPending}
          error={create.error?.response?.data?.message}
        />
      )}
    </div>
  );
}

function QuantityInput({ value, onChange }) {
  const STEP = 1;
  const num  = parseFloat(value) || 0;
  return (
    <div className="flex rounded-lg overflow-hidden border border-zinc-700 focus-within:border-brand-green transition-colors bg-zinc-800">
      <input
        type="text" inputMode="decimal"
        className="flex-1 bg-transparent text-white text-sm px-3 py-2 outline-none min-w-0"
        placeholder="0" value={value}
        onChange={(e) => { const r = e.target.value; if (r === "" || /^\d*\.?\d*$/.test(r)) onChange(r); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp")   { e.preventDefault(); onChange(String(Math.max(0, num + STEP))); }
          if (e.key === "ArrowDown") { e.preventDefault(); onChange(String(Math.max(0, num - STEP))); }
        }}
      />
      <div className="flex flex-col border-l border-zinc-700">
        <button type="button" tabIndex={-1} onClick={() => onChange(String(num + STEP))}
          className="flex-1 flex items-center justify-center px-2.5 text-zinc-400 hover:text-brand-green hover:bg-zinc-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
        <div className="h-px bg-zinc-700" />
        <button type="button" tabIndex={-1} onClick={() => onChange(String(Math.max(0, num - STEP)))}
          className="flex-1 flex items-center justify-center px-2.5 text-zinc-400 hover:text-brand-green hover:bg-zinc-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
    </div>
  );
}

function RequestForm({ orders, onSave, onClose, saving, error }) {
  const [data, setData]         = useState({ supply_catalog_id: "", item_name: "", quantity: "", unit: "Unidades", color: "", order_id: "", notes: "" });
  const [category, setCategory] = useState("");
  const set = (k, v) => setData((p) => ({ ...p, [k]: v }));

  const { data: catalog = [] } = useQuery({
    queryKey: ["supply-catalog"],
    queryFn: () => api.get("/supply-catalog").then((r) => r.data.data),
  });

  const categories = [...new Set(catalog.map((c) => c.category).filter(Boolean))].sort();
  const filtered   = category ? catalog.filter((c) => c.category === category) : catalog;

  function handleSelectCatalog(id) {
    const item = catalog.find((c) => c.id === id);
    set("supply_catalog_id", id);
    if (item) { set("item_name", item.name); set("unit", item.unit); }
    else       { set("item_name", ""); }
  }

  function handleCategoryChange(cat) {
    setCategory(cat);
    if (cat && data.supply_catalog_id) {
      const item = catalog.find((c) => c.id === data.supply_catalog_id);
      if (item && item.category !== cat) handleSelectCatalog("");
    }
  }

  function handleSubmit() {
    if (!data.item_name.trim() || !data.quantity) return;
    onSave({ ...data, quantity: parseFloat(data.quantity), order_id: data.order_id || null, supply_catalog_id: data.supply_catalog_id || null });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-white font-semibold">Solicitar insumo</h2>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Categoría</label>
              <CustomSelect value={category} onChange={(e) => handleCategoryChange(e.target.value)}>
                <option value="">Todas</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </CustomSelect>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Insumo *</label>
              <CustomSelect value={data.supply_catalog_id} onChange={(e) => handleSelectCatalog(e.target.value)}>
                <option value="">Seleccionar insumo</option>
                {filtered.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </CustomSelect>
            </div>
          </div>
          {!data.supply_catalog_id && (
            <input className="input-field" placeholder="O escribir manualmente..." value={data.item_name} onChange={(e) => set("item_name", e.target.value)} autoCapitalize="off" autoCorrect="off" />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Cantidad *</label>
              <QuantityInput value={data.quantity} onChange={(v) => set("quantity", v)} />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Unidad</label>
              <CustomSelect value={data.unit} onChange={(e) => set("unit", e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </CustomSelect>
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Color</label>
            <ColorPicker value={data.color} onChange={(v) => set("color", v)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Pedido relacionado</label>
            <CustomSelect value={data.order_id} onChange={(e) => set("order_id", e.target.value)}>
              <option value="">Sin pedido específico</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  #{String(o.order_number).padStart(3,"0")} — {o.customer_name}
                </option>
              ))}
            </CustomSelect>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Notas adicionales</label>
            <textarea className="input-field resize-none h-20" placeholder="Ej: Color específico, referencia..." value={data.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving || !data.item_name.trim() || !data.quantity}>
            {saving ? "Enviando..." : "Enviar solicitud"}
          </button>
        </div>
      </div>
    </div>
  );
}
