import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../config/api.js";
import { COLOMBIA, DEPARTAMENTOS } from "../../data/colombia.js";
import { UserIcon, PhoneIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import TabBar from "../../components/ui/TabBar.jsx";
import ColorPicker from "../../components/ui/ColorPicker.jsx";
import CustomSelect from "../../components/ui/CustomSelect.jsx";

const STATUS_COLORS = {
  pending:     "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  in_progress: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  delivered:   "bg-brand-green/20 text-brand-green border border-brand-green/30",
};
const STATUS_LABELS = {
  pending: "Pendiente", in_progress: "En proceso", delivered: "Entregado",
};
const AREA_LABELS = {
  corte: "Corte", diseno: "Diseño", sublimacion: "Sublimación",
  ensamble: "Ensamble", terminados: "Terminados",
};

const UNITS = ["Unidades", "Metros", "Kg", "Litros", "Rollos", "Yardas", "Piezas", "Resma"];

export default function SuppliesPage() {
  const [tab, setTab] = useState("requests");
  const [showRequestForm,  setShowRequestForm]  = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showCatalogForm,  setShowCatalogForm]  = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <TabBar
          tabs={[
            { value: "requests",  label: "Solicitudes" },
            { value: "catalog",   label: "Catálogo de Insumos" },
            { value: "suppliers", label: "Proveedores" },
          ]}
          value={tab}
          onChange={setTab}
        />
        <div className="order-first sm:order-last self-start sm:self-auto">
          {tab === "requests"  && <button className="btn-primary whitespace-nowrap" onClick={() => setShowRequestForm(true)}>+ Nueva solicitud</button>}
          {tab === "catalog"   && <button className="btn-primary whitespace-nowrap" onClick={() => setShowCatalogForm(true)}>+ Nuevo insumo</button>}
          {tab === "suppliers" && <button className="btn-primary whitespace-nowrap" onClick={() => setShowSupplierForm(true)}>+ Nuevo proveedor</button>}
        </div>
      </div>
      {tab === "requests"  && <RequestsTab  showForm={showRequestForm}  setShowForm={setShowRequestForm} />}
      {tab === "catalog"   && <CatalogTab   showForm={showCatalogForm}  setShowForm={setShowCatalogForm} />}
      {tab === "suppliers" && <SuppliersTab showForm={showSupplierForm} setShowForm={setShowSupplierForm} />}
    </div>
  );
}

const COLOR_HEX = { Blanco:"#FFFFFF", Negro:"#111111", Azul:"#2563EB", Rojo:"#DC2626", Amarillo:"#EAB308" };

function ColorSwatch({ color }) {
  const hex = COLOR_HEX[color] ?? (color?.startsWith("#") ? color : null);
  return (
    <span className="inline-flex items-center gap-1.5 justify-center">
      {hex && (
        <span className="w-3 h-3 rounded-full border border-white/20 shrink-0"
          style={{ backgroundColor: hex }} />
      )}
      <span className="text-zinc-300 text-xs">{color}</span>
    </span>
  );
}

function RowMenu({ onEdit, onManage }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-36 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden">
          <button
            onClick={() => { onEdit(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Editar
          </button>
          <div className="h-px bg-zinc-700 mx-2" />
          <button
            onClick={() => { onManage(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
            Gestionar
          </button>
        </div>
      )}
    </div>
  );
}

function RequestsTab({ showForm, setShowForm }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filter,   setFilter]   = useState("all");
  const [selected, setSelected] = useState(null);
  const [editing,  setEditing]  = useState(null);

  const { data: allData, isLoading } = useQuery({
    queryKey: ["supplies"],
    queryFn: () => api.get("/supplies").then((r) => r.data.data),
  });

  const data = filter === "all" ? allData : allData?.filter((r) => r.status === filter);

  const updateStatus = useMutation({
    mutationFn: ({ id, status, admin_notes }) => api.put(`/supplies/${id}`, { status, admin_notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplies"] }); setSelected(null); },
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/supplies/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplies"] }); setSelected(null); },
  });

  const create = useMutation({
    mutationFn: (d) => api.post("/supplies", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplies"] }); setShowForm(false); },
  });

  const editRequest = useMutation({
    mutationFn: ({ id, ...d }) => api.patch(`/supplies/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supplies"] }); setEditing(null); },
  });

  const { data: ordersData } = useQuery({
    queryKey: ["orders-simple"],
    queryFn: () => api.get("/orders?limit=50").then((r) => r.data.data),
  });

  const counts = (allData ?? []).reduce((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {});

  return (
    <div className="space-y-4">

      {/* Filtros — dropdown en móvil, botones en escritorio */}
      <div className="md:hidden">
        <CustomSelect value={filter} onChange={(e) => setFilter(e.target.value)}>
          {[["all","Todos"], ["pending","Pendientes"], ["in_progress","En proceso"], ["delivered","Entregados"]].map(([val, label]) => (
            <option key={val} value={val}>
              {label}{val !== "all" && counts[val] ? ` (${counts[val]})` : ""}
            </option>
          ))}
        </CustomSelect>
      </div>
      <TabBar
        tabs={[
          { value: "all",         label: "Todos" },
          { value: "pending",     label: "Pendientes",  count: counts.pending },
          { value: "in_progress", label: "En proceso",  count: counts.in_progress },
          { value: "delivered",   label: "Entregados",  count: counts.delivered },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {/* Cards — móvil y tablet */}
      <div className="lg:hidden">
        {isLoading && <p className="text-zinc-500 text-center py-8 text-sm">Cargando...</p>}
        {!isLoading && data?.length === 0 && (
          <div className="card text-center py-10"><p className="text-zinc-600 text-sm">Sin solicitudes</p></div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data?.map((r) => (
            <div key={r.id} className="card space-y-3">
              {/* Cabecera: insumo + badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-white font-semibold truncate">{r.item_name}</p>
                  {r.notes && <p className="text-zinc-500 text-xs mt-0.5 truncate">{r.notes}</p>}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 ${STATUS_COLORS[r.status]}`}>
                  {STATUS_LABELS[r.status]}
                </span>
              </div>
              {/* Meta */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                <span><span className="text-zinc-600">Área</span> {AREA_LABELS[r.worker_area] ?? r.worker_area ?? "—"}</span>
                <span><span className="text-zinc-600">Quién</span> {r.worker_name}</span>
                <span><span className="text-zinc-600">Cantidad</span> {parseFloat(r.quantity)} {r.unit}</span>
                {r.order_number && (
                  <span>
                    <span className="text-zinc-600">Pedido </span>
                    <button onClick={() => navigate(`/orders/${r.order_id}`)} className="text-brand-green font-mono hover:underline">
                      #{String(r.order_number).padStart(3,"0")}
                    </button>
                  </span>
                )}
              </div>
              {/* Footer: fecha + acciones */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <span className="text-zinc-600 text-xs">
                  {new Date(r.created_at).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" })}
                </span>
                <div className="flex gap-3">
                  <button onClick={() => setEditing(r)} className="text-zinc-500 hover:text-brand-green text-xs transition-colors">Editar</button>
                  <button onClick={() => setSelected(r)} className="text-brand-green hover:text-white text-xs font-medium transition-colors">Gestionar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla — solo escritorio */}
      <div className="hidden lg:block card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-left whitespace-nowrap">Área</th>
              <th className="px-4 py-3 text-left whitespace-nowrap">Insumo</th>
              <th className="px-4 py-3 text-center whitespace-nowrap">Color</th>
              <th className="px-4 py-3 text-center whitespace-nowrap">Cantidad</th>
              <th className="px-4 py-3 text-center whitespace-nowrap">Unidad</th>
              <th className="px-4 py-3 text-center whitespace-nowrap">Pedido</th>
              <th className="px-4 py-3 text-center whitespace-nowrap">Estado</th>
              <th className="px-4 py-3 text-center whitespace-nowrap">Fecha</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {isLoading && <tr><td colSpan={9} className="text-center py-8 text-zinc-500">Cargando...</td></tr>}
            {!isLoading && data?.length === 0 && (
              <tr><td colSpan={9} className="text-center py-8 text-zinc-600">Sin solicitudes</td></tr>
            )}
            {data?.map((r) => (
              <tr key={r.id} className="hover:bg-zinc-800/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-white whitespace-nowrap">{AREA_LABELS[r.worker_area] ?? r.worker_area ?? "—"}</p>
                  <p className="text-zinc-500 text-xs whitespace-nowrap">{r.worker_name}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-white">{r.item_name}</p>
                  {r.notes && <p className="text-zinc-500 text-xs truncate max-w-[160px]">{r.notes}</p>}
                </td>
                <td className="px-4 py-3 text-center">
                  {r.color
                    ? <ColorSwatch color={r.color} />
                    : <span className="text-zinc-600 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-zinc-300 whitespace-nowrap text-center">{parseFloat(r.quantity)}</td>
                <td className="px-4 py-3 text-zinc-300 whitespace-nowrap text-center">{r.unit}</td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  {r.order_number
                    ? <button onClick={() => navigate(`/orders/${r.order_id}`)} className="text-brand-green font-mono text-xs hover:underline">#{String(r.order_number).padStart(3,"0")}</button>
                    : <span className="text-zinc-600 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap text-center">
                  {new Date(r.created_at).toLocaleDateString("es-CO", { day:"2-digit", month:"short" })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <RowMenu onEdit={() => setEditing(r)} onManage={() => setSelected(r)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <RequestForm
          orders={ordersData ?? []}
          onSave={(d) => create.mutate(d)}
          onClose={() => setShowForm(false)}
          saving={create.isPending}
          error={create.error?.response?.data?.message}
        />
      )}

      {selected && (
        <ManageModal
          request={selected}
          onSave={(status, notes) => updateStatus.mutate({ id: selected.id, status, admin_notes: notes })}
          onDelete={() => { if (confirm("¿Eliminar esta solicitud?")) remove.mutate(selected.id); }}
          onClose={() => setSelected(null)}
          saving={updateStatus.isPending}
        />
      )}

      {editing && (
        <EditRequestModal
          request={editing}
          orders={ordersData ?? []}
          onSave={(d) => editRequest.mutate({ id: editing.id, ...d })}
          onClose={() => setEditing(null)}
          saving={editRequest.isPending}
        />
      )}
    </div>
  );
}

// ── Pestaña de Proveedores ─────────────────────────────────────────
function SuppliersTab({ showForm, setShowForm }) {
  const qc = useQueryClient();
  const [form, setFormInternal] = useState(null);

  useEffect(() => { if (showForm) setFormInternal({}); }, [showForm]);
  const setForm = (v) => { setFormInternal(v); if (!v) setShowForm(false); };

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api.get("/supplies/suppliers").then((r) => r.data.data),
  });

  const save = useMutation({
    mutationFn: (d) => d.id ? api.put(`/supplies/suppliers/${d.id}`, d) : api.post("/supplies/suppliers", d),
    onSuccess: () => { qc.invalidateQueries(["suppliers"]); setForm(null); },
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/supplies/suppliers/${id}`),
    onSuccess: () => qc.invalidateQueries(["suppliers"]),
  });

  return (
    <div className="space-y-4">
      {isLoading && <p className="text-zinc-500 text-center py-8 text-sm">Cargando...</p>}
      {!isLoading && data?.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-zinc-500 text-sm">Sin proveedores registrados.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((s) => (
          <div key={s.id} className={`card space-y-2 ${!s.is_active ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-white font-semibold">{s.name}</p>
                {!s.is_active && <span className="text-xs text-zinc-500">Inactivo</span>}
              </div>
              <button onClick={() => setForm(s)} className="text-zinc-500 hover:text-brand-green text-xs shrink-0">Editar</button>
            </div>
            <div className="space-y-1 text-sm">
              {s.contact_name && <p className="text-zinc-400 flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5 shrink-0" /> {s.contact_name}</p>}
              {s.phone        && <p className="text-zinc-400 flex items-center gap-1.5"><PhoneIcon className="w-3.5 h-3.5 shrink-0" /> {s.phone}</p>}
              {s.email        && <p className="text-zinc-400 flex items-center gap-1.5"><EnvelopeIcon className="w-3.5 h-3.5 shrink-0" /> {s.email}</p>}
              {(s.address || s.department || s.city) && (
                <p className="text-zinc-500 text-xs">
                  {[s.address, s.city, s.department].filter(Boolean).join(", ")}
                </p>
              )}
              {s.notes        && <p className="text-zinc-600 text-xs italic">"{s.notes}"</p>}
            </div>
            <div className="pt-1 border-t border-zinc-800 flex justify-end">
              <button onClick={() => { if (confirm(`¿Eliminar a ${s.name}?`)) remove.mutate(s.id); }}
                className="text-zinc-600 hover:text-red-400 text-xs transition-colors">Eliminar</button>
            </div>
          </div>
        ))}
      </div>

      {form !== null && (
        <SupplierModal
          form={form}
          onSave={(d) => save.mutate(d)}
          onClose={() => setForm(null)}
          saving={save.isPending}
          error={save.error?.response?.data?.message}
        />
      )}
    </div>
  );
}

function SupplierModal({ form, onSave, onClose, saving, error }) {
  const [data, setData] = useState({ name:"", contact_name:"", phone:"", email:"", department:"", city:"", address:"", notes:"", is_active:true, ...form });
  const set = (k, v) => setData((p) => ({ ...p, [k]: v }));
  const cities = data.department ? (COLOMBIA[data.department] || []) : [];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-white font-semibold">{data.id ? "Editar proveedor" : "Nuevo proveedor"}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Nombre *</label>
            <input className="input-field" placeholder="Nombre de la empresa o persona" value={data.name} onChange={(e) => set("name", e.target.value)} autoCapitalize="off" autoCorrect="off" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Contacto</label>
            <input className="input-field" placeholder="Nombre del contacto" value={data.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Teléfono</label>
              <input className="input-field" placeholder="3001234567" value={data.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Correo</label>
              <input className="input-field" type="email" placeholder="correo@proveedor.com" value={data.email} onChange={(e) => set("email", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Departamento</label>
              <CustomSelect value={data.department || ""} onChange={(e) => { set("department", e.target.value); set("city", ""); }}>
                <option value="">Seleccionar...</option>
                {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
              </CustomSelect>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Ciudad / Municipio</label>
              <CustomSelect value={data.city || ""} onChange={(e) => set("city", e.target.value)} disabled={!data.department}>
                <option value="">Seleccionar...</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </CustomSelect>
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Dirección</label>
            <input className="input-field" placeholder="Calle, carrera, barrio..." value={data.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Notas</label>
            <textarea className="input-field resize-none h-20" placeholder="Condiciones, horarios, observaciones..." value={data.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          {data.id && (
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
              <input type="checkbox" checked={data.is_active} onChange={(e) => set("is_active", e.target.checked)} className="rounded" />
              Proveedor activo
            </label>
          )}
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => onSave(data)} disabled={saving || !data.name.trim()}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RequestForm({ orders, onSave, onClose, saving, error }) {
  const [data, setData] = useState({ supply_catalog_id: "", item_name: "", quantity: "", unit: "unidades", color: "", order_id: "", notes: "" });
  const set = (k, v) => setData((p) => ({ ...p, [k]: v }));

  const { data: catalog = [] } = useQuery({
    queryKey: ["supply-catalog"],
    queryFn: () => api.get("/supply-catalog").then((r) => r.data.data),
  });

  function handleSelectCatalog(id) {
    const item = catalog.find((c) => c.id === id);
    set("supply_catalog_id", id);
    if (item) { set("item_name", item.name); set("unit", item.unit); }
    else       { set("item_name", ""); }
  }

  function handleSubmit() {
    if (!data.item_name.trim() || !data.quantity) return;
    onSave({ ...data, quantity: parseFloat(data.quantity), order_id: data.order_id || null, supply_catalog_id: data.supply_catalog_id || null });
  }

  const selected = catalog.find((c) => c.id === data.supply_catalog_id);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-white font-semibold">Nueva solicitud de insumo</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Insumo *</label>
            <CustomSelect value={data.supply_catalog_id} onChange={(e) => handleSelectCatalog(e.target.value)}>
              <option value="">Seleccionar del catálogo</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </CustomSelect>
            {!data.supply_catalog_id && (
              <input className="input-field mt-2" placeholder="O escribir manualmente..." value={data.item_name} onChange={(e) => set("item_name", e.target.value)} />
            )}
            {selected && (
              <p className="text-xs text-zinc-500 mt-1">Precio referencial: ${Number(selected.unit_price).toLocaleString("es-CO")} / {selected.unit}</p>
            )}
          </div>
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
          {selected && data.quantity > 0 && (
            <p className="text-xs text-brand-green font-medium">
              Costo estimado: ${(Number(selected.unit_price) * parseFloat(data.quantity || 0)).toLocaleString("es-CO")}
            </p>
          )}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Color</label>
            <ColorPicker value={data.color} onChange={(v) => set("color", v)} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Pedido relacionado</label>
            <CustomSelect value={data.order_id} onChange={(e) => set("order_id", e.target.value)}>
              <option value="">Sin pedido específico</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>#{String(o.order_number).padStart(3,"0")} — {o.customer_name}</option>
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

function EditRequestModal({ request, orders, onSave, onClose, saving }) {
  const [data, setData] = useState({
    item_name: request.item_name,
    quantity:  parseFloat(request.quantity),
    unit:      request.unit,
    order_id:  request.order_id || "",
    notes:     request.notes || "",
  });
  const set = (k, v) => setData((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-white font-semibold">Editar solicitud</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Insumo</label>
            <input className="input-field" value={data.item_name} onChange={(e) => set("item_name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Cantidad</label>
              <input className="input-field" type="number" min="0.01" step="0.01" value={data.quantity} onChange={(e) => set("quantity", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Unidad</label>
              <CustomSelect value={data.unit} onChange={(e) => set("unit", e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </CustomSelect>
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Pedido relacionado</label>
            <CustomSelect value={data.order_id} onChange={(e) => set("order_id", e.target.value)}>
              <option value="">Sin pedido específico</option>
              {orders.map((o) => <option key={o.id} value={o.id}>#{String(o.order_number).padStart(3,"0")} — {o.customer_name}</option>)}
            </CustomSelect>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Notas</label>
            <textarea className="input-field resize-none h-20" value={data.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => onSave({ ...data, order_id: data.order_id || null })} disabled={saving || !data.item_name.trim()}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ManageModal({ request, onSave, onDelete, onClose, saving }) {
  const [status, setStatus] = useState(request.status);
  const [notes,  setNotes]  = useState(request.admin_notes ?? "");

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-white font-semibold">Gestionar solicitud</h2>

        <div className="bg-zinc-800 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-zinc-400">Área</span><span className="text-white">{AREA_LABELS[request.worker_area] ?? request.worker_area ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">Trabajador</span><span className="text-white">{request.worker_name}</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">Insumo</span><span className="text-white font-medium">{request.item_name}</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">Cantidad</span><span className="text-white">{parseFloat(request.quantity)} {request.unit}</span></div>
          {request.order_number && <div className="flex justify-between"><span className="text-zinc-400">Pedido</span><span className="text-brand-green font-mono">#{String(request.order_number).padStart(3,"0")}</span></div>}
          {request.notes && <div className="flex justify-between gap-4"><span className="text-zinc-400 shrink-0">Notas</span><span className="text-zinc-300 text-right">{request.notes}</span></div>}
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Estado</label>
          <CustomSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">Pendiente</option>
            <option value="in_progress">En proceso</option>
            <option value="delivered">Entregado</option>
          </CustomSelect>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Notas del admin (opcional)</label>
          <textarea className="input-field resize-none h-20" placeholder="Ej: Se entrega el martes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex gap-2 justify-between">
          <button onClick={onDelete} className="text-red-400 hover:text-red-300 text-sm">Eliminar</button>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={() => onSave(status, notes)} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CATÁLOGO DE INSUMOS ────────────────────────────────────────

const CATEGORIES = ["Telas", "Elásticos", "Hilos", "Insumos de impresión", "Empaque", "Otros"];

function CatalogTab({ showForm, setShowForm }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["supply-catalog-all"],
    queryFn: () => api.get("/supply-catalog/all").then((r) => r.data.data),
  });

  const createMut = useMutation({
    mutationFn: (d) => api.post("/supply-catalog", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supply-catalog-all"] }); qc.invalidateQueries({ queryKey: ["supply-catalog"] }); setShowForm(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/supply-catalog/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supply-catalog-all"] }); qc.invalidateQueries({ queryKey: ["supply-catalog"] }); setEditing(null); },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) => api.put(`/supply-catalog/${id}`, { is_active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["supply-catalog-all"] }); qc.invalidateQueries({ queryKey: ["supply-catalog"] }); },
  });

  // Agrupar por categoría
  const grouped = items.reduce((acc, item) => {
    const cat = item.category || "Sin categoría";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {isLoading && <p className="text-zinc-500 text-center py-8 text-sm">Cargando...</p>}

      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} className="card space-y-2">
          <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">{cat}</h3>
          <div className="space-y-1">
            {catItems.map((item) => (
              <div key={item.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${item.is_active ? "bg-zinc-800" : "bg-zinc-900 opacity-50"}`}>
                <div className="min-w-0 flex-1">
                  <span className="text-white text-sm font-medium">{item.name}</span>
                  <span className="text-zinc-500 text-xs ml-2">{item.unit}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-brand-green text-sm">${Number(item.unit_price).toLocaleString("es-CO")}</span>
                  <button onClick={() => setEditing(item)} className="text-zinc-400 hover:text-white text-xs transition-colors">Editar</button>
                  <button
                    onClick={() => toggleMut.mutate({ id: item.id, is_active: !item.is_active })}
                    className={`text-xs transition-colors ${item.is_active ? "text-zinc-500 hover:text-red-400" : "text-zinc-600 hover:text-brand-green"}`}
                  >
                    {item.is_active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!isLoading && items.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-zinc-500 text-sm">No hay insumos en el catálogo</p>
          <p className="text-zinc-600 text-xs mt-1">Crea el primero con el botón "+ Nuevo insumo"</p>
        </div>
      )}

      {(showForm || editing) && (
        <CatalogItemModal
          item={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={(d) => editing ? updateMut.mutate({ id: editing.id, ...d }) : createMut.mutate(d)}
          saving={createMut.isPending || updateMut.isPending}
        />
      )}
    </div>
  );
}

/** Input de precio con formato colombiano (puntos como separadores de miles) y flechas custom */
function QuantityInput({ value, onChange }) {
  const STEP = 1;
  const num  = parseFloat(value) || 0;

  return (
    <div className="flex rounded-lg overflow-hidden border border-zinc-700 focus-within:border-brand-green transition-colors bg-zinc-800">
      <input
        type="text"
        inputMode="decimal"
        className="flex-1 bg-transparent text-white text-sm px-3 py-2 outline-none min-w-0"
        placeholder="0"
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "" || /^\d*\.?\d*$/.test(raw)) onChange(raw);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp")   { e.preventDefault(); onChange(String(Math.max(0, num + STEP))); }
          if (e.key === "ArrowDown") { e.preventDefault(); onChange(String(Math.max(0, num - STEP))); }
        }}
      />
      <div className="flex flex-col border-l border-zinc-700">
        <button
          type="button" tabIndex={-1}
          onClick={() => onChange(String(num + STEP))}
          className="flex-1 flex items-center justify-center px-2.5 text-zinc-400 hover:text-brand-green hover:bg-zinc-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
        <div className="h-px bg-zinc-700" />
        <button
          type="button" tabIndex={-1}
          onClick={() => onChange(String(Math.max(0, num - STEP)))}
          className="flex-1 flex items-center justify-center px-2.5 text-zinc-400 hover:text-brand-green hover:bg-zinc-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function PriceInput({ value, onChange, placeholder = "0" }) {
  const STEP = 100;

  // Formatear número a string con puntos: 8400 → "8.400"
  function fmt(n) {
    if (!n && n !== 0) return "";
    return Number(n).toLocaleString("es-CO", { maximumFractionDigits: 0 });
  }

  // Limpiar string con formato a número: "8.400" → 8400
  function parse(str) {
    return parseInt(String(str).replace(/\./g, "").replace(/,/g, ""), 10) || 0;
  }

  function handleChange(e) {
    const raw = e.target.value.replace(/\./g, ""); // quitar puntos actuales
    if (raw === "" || raw === "0") { onChange(""); return; }
    const n = parseInt(raw, 10);
    if (isNaN(n)) return;
    onChange(n);
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowUp")   { e.preventDefault(); onChange(Math.max(0, parse(value) + STEP)); }
    if (e.key === "ArrowDown") { e.preventDefault(); onChange(Math.max(0, parse(value) - STEP)); }
  }

  const numVal = parse(value);

  return (
    <div className="flex rounded-lg overflow-hidden border border-zinc-700 focus-within:border-brand-green transition-colors bg-zinc-800">
      {/* Prefijo $ */}
      <span className="flex items-center px-2.5 text-zinc-500 text-sm select-none bg-zinc-800 border-r border-zinc-700">$</span>

      {/* Input texto con formato */}
      <input
        type="text"
        inputMode="numeric"
        className="flex-1 bg-transparent text-white text-sm px-2 py-2 outline-none min-w-0"
        placeholder={placeholder}
        value={fmt(value)}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />

      {/* Flechas custom */}
      <div className="flex flex-col border-l border-zinc-700">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => onChange(numVal + STEP)}
          className="flex-1 flex items-center justify-center px-2.5 text-zinc-400 hover:text-brand-green hover:bg-zinc-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
        <div className="h-px bg-zinc-700" />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => onChange(Math.max(0, numVal - STEP))}
          className="flex-1 flex items-center justify-center px-2.5 text-zinc-400 hover:text-brand-green hover:bg-zinc-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function CatalogItemModal({ item, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    name:       item?.name       || "",
    unit:       item?.unit       || "metros",
    unit_price: item?.unit_price || "",
    category:   item?.category   || "",
    notes:      item?.notes      || "",
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-white font-semibold">{item ? "Editar insumo" : "Nuevo insumo"}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Nombre *</label>
            <input className="input-field" placeholder="Ej: Tela Sublimación Blanca" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Unidad *</label>
              <CustomSelect value={form.unit} onChange={(e) => set("unit", e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </CustomSelect>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Precio por unidad (COP)</label>
              <PriceInput value={form.unit_price} onChange={(v) => set("unit_price", v)} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Categoría</label>
            <CustomSelect value={form.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">Sin categoría</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </CustomSelect>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Notas</label>
            <input className="input-field" placeholder="Descripción adicional..." value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => onSave(form)} disabled={saving || !form.name.trim() || !form.unit}>
            {saving ? "Guardando..." : item ? "Actualizar" : "Crear insumo"}
          </button>
        </div>
      </div>
    </div>
  );
}
