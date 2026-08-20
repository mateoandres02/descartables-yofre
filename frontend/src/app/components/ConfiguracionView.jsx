import { useState, useEffect } from "react";
import { CreditCard, Receipt, Plus, Trash2, Edit2, Tag, X, AlertTriangle, Eye, EyeOff, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import api from "../../services/api.js";
import { Loader } from "./Loader.jsx";

export function ConfiguracionView() {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, item: null });
  const [expenseModal, setExpenseModal] = useState({ isOpen: false, item: null });
  const [categoryModal, setCategoryModal] = useState({ isOpen: false, item: null });
  const [submitting, setSubmitting] = useState(false);
  const [showGastos, setShowGastos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteExpenseConfirm, setDeleteExpenseConfirm] = useState(null);

  // Porcentajes sugeridos
  const [suggestedPercents, setSuggestedPercents] = useState([]);
  const [newPercent, setNewPercent] = useState("");
  const [addingPercent, setAddingPercent] = useState(false);

  async function fetchData() {
    setLoading(true);
    try {
      const [pRes, eRes, cRes, sRes] = await Promise.all([
        api.get("/payment-methods"),
        api.get("/fixed-expenses"),
        api.get("/categories"),
        api.get("/settings/suggested-prices"),
      ]);
      setPaymentMethods(pRes.data);
      setExpenses(eRes.data);
      setCategories(cRes.data);
      setSuggestedPercents(sRes.data.percents ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  // ── Métodos de pago ──────────────────────────────────
  const handleSavePayment = async (payment) => {
    if (!payment.name.trim()) { toast.error("El nombre del método es obligatorio"); return; }
    if (submitting) return;
    setSubmitting(true);
    const payload = { ...payment, surcharge: Number(payment.surcharge) || 0 };
    try {
      if (payment.id && paymentMethods.some((p) => p.id === payment.id)) {
        await api.put(`/payment-methods/${payment.id}`, payload);
        toast.success("Método de pago actualizado");
      } else {
        await api.post("/payment-methods", payload);
        toast.success("Método de pago agregado");
      }
      setPaymentModal({ isOpen: false, item: null });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemovePayment = async (id) => {
    try {
      await api.delete(`/payment-methods/${id}`);
      toast.success("Método de pago eliminado");
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || "Error"); }
  };

  // ── Gastos fijos ─────────────────────────────────────
  const handleSaveExpense = async (expense) => {
    if (!expense.name.trim()) { toast.error("La descripción del gasto es obligatoria"); return; }
    if (submitting) return;
    setSubmitting(true);
    const payload = { ...expense, amount: Number(expense.amount) || 0 };
    try {
      if (expense.id && expenses.some((e) => e.id === expense.id)) {
        await api.put(`/fixed-expenses/${expense.id}`, payload);
        toast.success("Gasto actualizado");
      } else {
        await api.post("/fixed-expenses", payload);
        toast.success("Gasto agregado");
      }
      setExpenseModal({ isOpen: false, item: null });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveExpense = async (id) => {
    try {
      await api.delete(`/fixed-expenses/${id}`);
      toast.success("Gasto eliminado");
      setDeleteExpenseConfirm(null);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || "Error"); }
  };

  // ── Categorías ───────────────────────────────────────
  const handleSaveCategory = async () => {
    const { item } = categoryModal;
    if (!item?.name?.trim()) { toast.error("El nombre de la categoría es obligatorio"); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      if (item.id) {
        await api.put(`/categories/${item.id}`, { name: item.name.trim() });
        toast.success("Categoría actualizada");
      } else {
        await api.post("/categories", { name: item.name.trim() });
        toast.success("Categoría agregada");
      }
      setCategoryModal({ isOpen: false, item: null });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveCategory = async (id) => {
    try {
      await api.delete(`/categories/${id}`);
      toast.success("Categoría eliminada");
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || "Error"); }
  };

  // ── Porcentajes sugeridos ─────────────────────────────
  const handleAddPercent = async () => {
    const val = Number(newPercent);
    if (!newPercent || isNaN(val) || val < 0) { toast.error("Ingresá un porcentaje válido"); return; }
    if (val === 80) { toast.error("El 80% ya está disponible por defecto en todos los productos"); return; }
    if (addingPercent) return;
    setAddingPercent(true);
    try {
      const res = await api.post("/settings/suggested-prices", { percent: val });
      setSuggestedPercents(res.data.percents);
      setNewPercent("");
      toast.success(`${val}% agregado`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al agregar");
    } finally {
      setAddingPercent(false);
    }
  };

  const handleRemovePercent = async (pct) => {
    try {
      const res = await api.delete(`/settings/suggested-prices/${pct}`);
      setSuggestedPercents(res.data.percents);
      toast.success(`${pct}% eliminado`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al eliminar");
    }
  };

  return (
    <div className="flex-1 p-4 pb-20 md:p-8 overflow-y-auto relative">
      {loading && <Loader />}
      <div className="mb-6 md:mb-8">
        <h1 className="text-[#cc679c] font-bold text-2xl md:text-4xl mb-1 md:mb-2">Configuración</h1>
        <p className="text-[#cc679c]/80 font-medium text-sm">Ajustes generales y financieros del sistema</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {/* Métodos de pago */}
        <div className="bg-[#f4f3f0] rounded-xl border border-[#e5e7eb] overflow-hidden shadow-sm flex flex-col">
          <div className="p-6 border-b border-[#e5e7eb] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="text-[#cc679c]" size={24} />
              <h2 className="text-[#5db8d1] text-xl font-bold">Métodos de Pago y Cargos</h2>
            </div>
            <button onClick={() => setPaymentModal({ isOpen: true, item: { name: "", surcharge: "" } })} className="text-[#cc679c] hover:text-[#eceae7] hover:bg-[#cc679c] transition-colors p-2 bg-[#eceae7] rounded-lg shadow-sm font-bold">
              <Plus size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex gap-4 items-center bg-[#eceae7] p-4 rounded-xl border border-[#e5e7eb] shadow-sm">
                <div className="flex-1"><span className="text-[#cc679c] font-bold">{method.name}</span></div>
                <div className="text-[#cc679c]/80 font-medium w-32 text-right">{method.surcharge > 0 ? `+${method.surcharge}%` : "0%"}</div>
                <div className="flex gap-2">
                  <button onClick={() => setPaymentModal({ isOpen: true, item: { ...method, surcharge: method.surcharge === 0 ? "" : String(method.surcharge) } })} className="text-[#5db8d1] hover:text-[#4a9bb8] p-2 transition-colors"><Edit2 size={20} /></button>
                  <button onClick={() => handleRemovePayment(method.id)} className="text-[#cc679c]/60 hover:text-red-500 p-2 transition-colors"><Trash2 size={20} /></button>
                </div>
              </div>
            ))}
            {paymentMethods.length === 0 && <p className="text-[#cc679c]/60 font-medium text-sm">Sin métodos de pago configurados</p>}
          </div>
        </div>

        {/* Gastos fijos */}
        <div className="bg-[#f4f3f0] rounded-xl border border-[#e5e7eb] overflow-hidden shadow-sm flex flex-col">
          <div className="p-6 border-b border-[#e5e7eb] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Receipt className="text-[#5db8d1]" size={24} />
              <h2 className="text-[#5db8d1] text-xl font-bold">Gastos Fijos</h2>
              <button onClick={() => setShowGastos((v) => !v)} title={showGastos ? "Ocultar montos" : "Mostrar montos"} className="text-[#cc679c]/40 hover:text-[#cc679c] transition-colors">
                {showGastos ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
            <button onClick={() => setExpenseModal({ isOpen: true, item: { name: "", amount: "" } })} className="text-[#cc679c] hover:text-[#eceae7] hover:bg-[#cc679c] transition-colors p-2 bg-[#eceae7] rounded-lg shadow-sm font-bold">
              <Plus size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex gap-4 items-center bg-[#eceae7] p-4 rounded-xl border border-[#e5e7eb] shadow-sm">
                <div className="flex-1"><span className="text-[#cc679c] font-bold">{expense.name}</span></div>
                <div className="w-40 text-right font-black">
                  {showGastos
                    ? <span className="text-[#cc679c]/80">${Number(expense.amount).toFixed(2)}</span>
                    : <span className="text-[#cc679c]/30 tracking-widest select-none">••••</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setExpenseModal({ isOpen: true, item: { ...expense, amount: expense.amount === 0 ? "" : String(expense.amount) } })} className="text-[#5db8d1] hover:text-[#4a9bb8] p-2 transition-colors"><Edit2 size={20} /></button>
                  <button onClick={() => setDeleteExpenseConfirm(expense)} className="text-[#cc679c]/60 hover:text-red-500 p-2 transition-colors"><Trash2 size={20} /></button>
                </div>
              </div>
            ))}
            {expenses.length === 0 && <p className="text-[#cc679c]/60 font-medium text-sm">Sin gastos configurados</p>}
          </div>
        </div>

        {/* Categorías de producto */}
        <div className="bg-[#f4f3f0] rounded-xl border border-[#e5e7eb] overflow-hidden shadow-sm flex flex-col">
          <div className="p-6 border-b border-[#e5e7eb] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tag className="text-green-400" size={24} />
              <h2 className="text-[#5db8d1] text-xl font-bold">Categorías de Producto</h2>
            </div>
            <button onClick={() => setCategoryModal({ isOpen: true, item: { name: "" } })} className="text-[#cc679c] hover:text-[#eceae7] hover:bg-[#cc679c] transition-colors p-2 bg-[#eceae7] rounded-lg shadow-sm font-bold">
              <Plus size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {categories.map((cat) => (
              <div key={cat.id} className="flex gap-4 items-center bg-[#eceae7] p-4 rounded-xl border border-[#e5e7eb] shadow-sm">
                <div className="flex-1"><span className="text-[#cc679c] font-bold">{cat.name}</span></div>
                <div className="flex gap-2">
                  <button onClick={() => setCategoryModal({ isOpen: true, item: { ...cat } })} className="text-[#5db8d1] hover:text-[#4a9bb8] p-2 transition-colors"><Edit2 size={20} /></button>
                  <button onClick={() => handleRemoveCategory(cat.id)} className="text-[#cc679c]/60 hover:text-red-500 p-2 transition-colors"><Trash2 size={20} /></button>
                </div>
              </div>
            ))}
            {categories.length === 0 && <p className="text-[#cc679c]/60 font-medium text-sm">Sin categorías configuradas</p>}
          </div>
        </div>

        {/* Precios de Venta Sugeridos */}
        <div className="bg-[#f4f3f0] rounded-xl border border-[#e5e7eb] overflow-hidden shadow-sm flex flex-col">
          <div className="p-6 border-b border-[#e5e7eb] flex items-center gap-3">
            <TrendingUp className="text-[#e3ac4d]" size={24} />
            <h2 className="text-[#5db8d1] text-xl font-bold">Precios de Venta Sugeridos</h2>
          </div>
          <div className="p-6 space-y-5">
            <p className="text-[#cc679c]/70 font-medium text-sm leading-relaxed">
              Cargá uno o más porcentajes de ganancia sobre el costo. Al crear o editar un producto, podrás elegir uno para que se calcule el precio automáticamente.
              <br />
              <span className="font-bold text-[#cc679c]/90">Fórmula:</span> Precio = Costo × (1 + %/100), redondeado al próximo centenar.
            </p>

            {/* 80% fijo (siempre presente, no configurable) */}
            <div className="flex items-center gap-2 bg-[#cc679c]/5 border border-[#cc679c]/20 rounded-xl px-4 py-3">
              <TrendingUp size={15} className="text-[#cc679c]/50 shrink-0" />
              <p className="text-[#cc679c]/70 font-medium text-sm flex-1">
                El <span className="font-black text-[#cc679c]">80%</span> está disponible por defecto como acceso rápido en todos los productos.
              </p>
            </div>

            {/* Chips de porcentajes adicionales (excluye 80%) */}
            <div className="flex flex-wrap gap-2 min-h-[40px]">
              {suggestedPercents.filter((p) => p !== 80).length === 0 && (
                <p className="text-[#cc679c]/40 font-medium text-sm italic">Sin porcentajes adicionales configurados</p>
              )}
              {suggestedPercents.filter((p) => p !== 80).map((pct) => (
                <div key={pct} className="flex items-center gap-1.5 bg-[#cc679c]/10 border border-[#cc679c]/30 text-[#cc679c] font-black rounded-full px-4 py-1.5 text-sm">
                  <span>{pct}%</span>
                  <button
                    onClick={() => handleRemovePercent(pct)}
                    className="text-[#cc679c]/50 hover:text-red-500 transition-colors ml-1"
                    title="Eliminar"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Input para agregar nuevo porcentaje */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  value={newPercent}
                  onChange={(e) => setNewPercent(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => e.key === "Enter" && handleAddPercent()}
                  placeholder="Ej. 80"
                  min="0"
                  step="1"
                  className="w-full bg-white text-[#cc679c] font-bold rounded-xl px-4 py-3 pr-10 border border-[#e5e7eb] focus:border-[#cc679c] focus:ring-2 focus:ring-[#cc679c]/20 outline-none shadow-sm transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#cc679c]/50 font-bold">%</span>
              </div>
              <button
                onClick={handleAddPercent}
                disabled={!newPercent || addingPercent}
                className="bg-[#cc679c] hover:bg-[#b85889] disabled:bg-[#e5e7eb] disabled:text-[#cc679c]/40 text-white font-bold px-5 py-3 rounded-xl transition-all shadow-md shrink-0 flex items-center gap-2"
              >
                <Plus size={18} />
                Agregar
              </button>
            </div>

            {newPercent !== "" && !isNaN(Number(newPercent)) && Number(newPercent) > 0 && (
              <div className="bg-[#eceae7] border border-[#e5e7eb] rounded-xl p-3 text-sm flex items-center justify-between">
                <span className="text-[#cc679c]/70 font-medium">Vista previa con costo $1.000:</span>
                <span className="text-[#cc679c] font-black">${Math.ceil((1000 * (1 + Number(newPercent) / 100)) / 5) * 5}</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal método de pago */}
      {paymentModal.isOpen && paymentModal.item && (
        <div className="fixed inset-0 bg-[#cc679c]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#eceae7] rounded-2xl w-full max-w-md border border-[#f4f3f0] shadow-2xl">
            <div className="p-6 border-b border-[#f4f3f0] flex items-center justify-between">
              <h2 className="text-[#5db8d1] font-bold text-2xl flex items-center gap-2"><CreditCard size={24} className="text-[#cc679c]" />{paymentModal.item.id ? "Editar Método" : "Nuevo Método"}</h2>
              <button onClick={() => setPaymentModal({ isOpen: false, item: null })} className="text-[#cc679c]/60 hover:text-[#cc679c] transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[#cc679c]/80 font-bold text-sm block mb-2">Nombre del método</label>
                <input type="text" value={paymentModal.item.name} onChange={(e) => setPaymentModal((prev) => ({ ...prev, item: { ...prev.item, name: e.target.value } }))} className="w-full bg-white text-[#cc679c] placeholder-[#cc679c]/50 rounded-xl px-4 py-3 border border-[#f4f3f0] focus:border-[#cc679c] focus:ring-2 focus:ring-[#cc679c]/20 outline-none font-bold transition-all shadow-sm" placeholder="Ej. Mercado Pago" />
              </div>
              <div>
                <label className="text-[#cc679c]/80 font-bold text-sm block mb-2">Recargo (%)</label>
                <input type="number" value={paymentModal.item.surcharge} onChange={(e) => setPaymentModal((prev) => ({ ...prev, item: { ...prev.item, surcharge: e.target.value } }))} onFocus={(e) => e.target.select()} className="w-full bg-white text-[#cc679c] rounded-xl px-4 py-3 border border-[#f4f3f0] focus:border-[#cc679c] focus:ring-2 focus:ring-[#cc679c]/20 outline-none font-bold transition-all shadow-sm" placeholder="0" min="0" step="0.01" />
              </div>
            </div>
            <div className="p-6 border-t border-[#f4f3f0] flex gap-4">
              <button onClick={() => setPaymentModal({ isOpen: false, item: null })} className="flex-1 bg-[#f4f3f0] hover:bg-[#e5e7eb] text-[#cc679c] font-bold py-4 rounded-xl transition-all shadow-sm">Cancelar</button>
              <button onClick={() => handleSavePayment(paymentModal.item)} disabled={submitting} className="flex-1 bg-[#cc679c] hover:bg-[#b85889] disabled:bg-[#f4f3f0] disabled:text-[#cc679c]/50 disabled:cursor-not-allowed text-[#eceae7] font-bold py-4 rounded-xl transition-all shadow-md">{submitting ? "Guardando..." : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gasto fijo */}
      {expenseModal.isOpen && expenseModal.item && (
        <div className="fixed inset-0 bg-[#cc679c]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#eceae7] rounded-2xl w-full max-w-md border border-[#f4f3f0] shadow-2xl">
            <div className="p-6 border-b border-[#f4f3f0] flex items-center justify-between">
              <h2 className="text-[#5db8d1] font-bold text-2xl flex items-center gap-2"><Receipt size={24} className="text-[#5db8d1]" />{expenseModal.item.id ? "Editar Gasto" : "Nuevo Gasto"}</h2>
              <button onClick={() => setExpenseModal({ isOpen: false, item: null })} className="text-[#cc679c]/60 hover:text-[#cc679c] transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[#cc679c]/80 font-bold text-sm block mb-2">Descripción del gasto</label>
                <input type="text" value={expenseModal.item.name} onChange={(e) => setExpenseModal((prev) => ({ ...prev, item: { ...prev.item, name: e.target.value } }))} className="w-full bg-white text-[#cc679c] placeholder-[#cc679c]/50 rounded-xl px-4 py-3 border border-[#f4f3f0] focus:border-[#cc679c] focus:ring-2 focus:ring-[#cc679c]/20 outline-none font-bold transition-all shadow-sm" placeholder="Ej. Alquiler" />
              </div>
              <div>
                <label className="text-[#cc679c]/80 font-bold text-sm block mb-2">Monto ($)</label>
                <input type="number" value={expenseModal.item.amount} onChange={(e) => setExpenseModal((prev) => ({ ...prev, item: { ...prev.item, amount: e.target.value } }))} onFocus={(e) => e.target.select()} className="w-full bg-white text-[#cc679c] rounded-xl px-4 py-3 border border-[#f4f3f0] focus:border-[#cc679c] focus:ring-2 focus:ring-[#cc679c]/20 outline-none font-bold transition-all shadow-sm" placeholder="0.00" min="0" step="0.01" />
              </div>
            </div>
            <div className="p-6 border-t border-[#f4f3f0] flex gap-4">
              <button onClick={() => setExpenseModal({ isOpen: false, item: null })} className="flex-1 bg-[#f4f3f0] hover:bg-[#e5e7eb] text-[#cc679c] font-bold py-4 rounded-xl transition-all shadow-sm">Cancelar</button>
              <button onClick={() => handleSaveExpense(expenseModal.item)} disabled={submitting} className="flex-1 bg-[#cc679c] hover:bg-[#b85889] disabled:bg-[#f4f3f0] disabled:text-[#cc679c]/50 disabled:cursor-not-allowed text-[#eceae7] font-bold py-4 rounded-xl transition-all shadow-md">{submitting ? "Guardando..." : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación eliminación gasto fijo */}
      {deleteExpenseConfirm && (
        <div className="fixed inset-0 bg-[#cc679c]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#eceae7] rounded-2xl w-full max-w-md border border-[#f4f3f0] shadow-2xl">
            <div className="p-6 border-b border-[#f4f3f0] flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/15 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <h2 className="text-[#cc679c] font-bold text-xl">Eliminar Gasto Fijo</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[#cc679c] font-medium">
                ¿Estás seguro que querés eliminar <span className="font-black">"{deleteExpenseConfirm.name}"</span>?
              </p>
              <div className="bg-[#e3ac4d]/10 border border-[#e3ac4d]/30 rounded-xl p-4 flex gap-3">
                <AlertTriangle size={18} className="text-[#e3ac4d] shrink-0 mt-0.5" />
                <p className="text-[#cc679c]/80 font-medium text-sm">
                  Esta acción afectará las métricas de <span className="font-bold">Estadísticas</span>: el total de Gastos Operativos, el Balance Neto y la Liquidez Disponible se recalcularán sin este gasto.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-[#f4f3f0] flex gap-4">
              <button onClick={() => setDeleteExpenseConfirm(null)} className="flex-1 bg-[#f4f3f0] hover:bg-[#e5e7eb] text-[#cc679c] font-bold py-4 rounded-xl transition-all shadow-sm">Cancelar</button>
              <button onClick={() => handleRemoveExpense(deleteExpenseConfirm.id)} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl transition-all shadow-md">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal categoría */}
      {categoryModal.isOpen && categoryModal.item && (
        <div className="fixed inset-0 bg-[#cc679c]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#eceae7] rounded-2xl w-full max-w-md border border-[#f4f3f0] shadow-2xl">
            <div className="p-6 border-b border-[#f4f3f0] flex items-center justify-between">
              <h2 className="text-[#5db8d1] font-bold text-2xl flex items-center gap-2">
                <Tag size={24} className="text-green-400" />
                {categoryModal.item.id ? "Editar Categoría" : "Nueva Categoría"}
              </h2>
              <button onClick={() => setCategoryModal({ isOpen: false, item: null })} className="text-[#cc679c]/60 hover:text-[#cc679c] transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6">
              <label className="text-[#cc679c]/80 font-bold text-sm block mb-2">Nombre de la categoría</label>
              <input type="text" value={categoryModal.item.name} onChange={(e) => setCategoryModal((prev) => ({ ...prev, item: { ...prev.item, name: e.target.value } }))} onKeyDown={(e) => e.key === "Enter" && handleSaveCategory()} className="w-full bg-white text-[#cc679c] placeholder-[#cc679c]/50 rounded-xl px-4 py-3 border border-[#f4f3f0] focus:border-[#cc679c] focus:ring-2 focus:ring-[#cc679c]/20 outline-none font-bold transition-all shadow-sm" placeholder="Ej. Novelas, Poesía, Infantiles..." autoFocus />
            </div>
            <div className="p-6 border-t border-[#f4f3f0] flex gap-4">
              <button onClick={() => setCategoryModal({ isOpen: false, item: null })} className="flex-1 bg-[#f4f3f0] hover:bg-[#e5e7eb] text-[#cc679c] font-bold py-4 rounded-xl transition-all shadow-sm">Cancelar</button>
              <button onClick={handleSaveCategory} disabled={submitting} className="flex-1 bg-[#cc679c] hover:bg-[#b85889] disabled:bg-[#f4f3f0] disabled:text-[#cc679c]/50 disabled:cursor-not-allowed text-[#eceae7] font-bold py-4 rounded-xl transition-all shadow-md">{submitting ? "Guardando..." : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
