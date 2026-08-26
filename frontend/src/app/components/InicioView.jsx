import { useState, useEffect } from "react";
import { TrendingUp, Activity, Clock, Lock, Unlock, Receipt, Package, Wallet, BookUp, PackageMinus, X } from "lucide-react";
import { toast } from "sonner";
import api from "../../services/api.js";
import { Loader } from "./Loader.jsx";
import { formatStock } from "../../utils/pack.js";

export function InicioView({ isCajaOpen, onOpenCaja, onCloseCaja, transactions }) {
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [systemLog, setSystemLog] = useState([]);
  const [products, setProducts] = useState([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawProductId, setWithdrawProductId] = useState("");
  const [withdrawQty, setWithdrawQty] = useState("");
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [searchWithdraw, setSearchWithdraw] = useState("");
  const [loading, setLoading] = useState(true);

  const LOG_ICONS = {
    Unlock,
    Lock,
    Wallet,
    BookUp,
    PackageMinus,
    Package
  };

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      api.get("/fixed-expenses"),
      api.get("/stats/activity-log"),
      api.get("/products")
    ])
      .then(([rExp, rLog, rProd]) => { 
        if (rExp.status === "fulfilled") setExpenses(rExp.value.data); 
        if (rLog.status === "fulfilled") setSystemLog(rLog.value.data); 
        if (rProd.status === "fulfilled") setProducts(rProd.value.data.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
      })
      .finally(() => setLoading(false));
  }, []);

  const recentSales = transactions.slice(0, 5).map((t) => ({
    id: t.id,
    time: t.time,
    total: t.total,
    items: t.items?.reduce((sum, i) => sum + i.quantity, 0) || 0,
    details: t.items?.map((i) => `${i.quantity}x ${i.name}`) || [],
  }));

  const ventasHoy = isCajaOpen ? transactions.reduce((sum, t) => sum + t.total, 0) : 0;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleConfirmOpen = async () => {
    try {
      await onOpenCaja(Number(openingAmount) || 0);
      setShowOpenModal(false);
      setOpeningAmount("0");
      toast.success("Caja abierta exitosamente");
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al abrir caja");
    }
  };

  const handleConfirmClose = async () => {
    try {
      await onCloseCaja();
      setShowClosureModal(false);
      toast.success("Caja cerrada exitosamente");
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al cerrar caja");
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawProductId || !withdrawQty || withdrawQty <= 0) return;
    setSubmittingWithdraw(true);
    try {
      await api.post("/internal-withdrawals", { productId: Number(withdrawProductId), quantity: Number(withdrawQty) });
      toast.success("Mercadería retirada correctamente");
      setShowWithdrawModal(false);
      setWithdrawProductId("");
      setWithdrawQty("");
      setSearchWithdraw("");
      const [rLog, rProd] = await Promise.allSettled([api.get("/stats/activity-log"), api.get("/products")]);
      if (rLog.status === "fulfilled") setSystemLog(rLog.value.data);
      if (rProd.status === "fulfilled") setProducts(rProd.value.data.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    } catch (err) {
      toast.error("Error al retirar", { description: err.response?.data?.message || err.message });
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  return (
    <div className="flex-1 p-4 pb-20 md:p-8 overflow-y-auto relative">
      {loading && <Loader />}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 md:mb-8 gap-3">
        <div>
          <h1 className="text-foreground font-bold text-2xl md:text-4xl mb-1 md:mb-2">Panel de Inicio</h1>
          <p className="text-foreground/80 text-sm font-medium">Resumen en vivo de tu negocio</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowWithdrawModal(true)} className="bg-primary hover:bg-secondary text-foreground px-3 md:px-6 py-2.5 md:py-3 rounded-xl flex items-center gap-2 transition-all text-sm md:text-base font-bold shadow-sm">
            <PackageMinus size={18} /> <span>Retirar</span>
          </button>
          {isCajaOpen ? (
            <button onClick={() => setShowClosureModal(true)} className="bg-secondary hover:brightness-125 text-foreground px-3 md:px-6 py-2.5 md:py-3 rounded-xl flex items-center gap-2 transition-all text-sm md:text-base font-medium shadow-md">
              <Lock size={18} /> <span>Cerrar Caja</span>
            </button>
          ) : (
            <button onClick={() => setShowOpenModal(true)} className="bg-success hover:brightness-125 text-foreground px-3 md:px-6 py-2.5 md:py-3 rounded-xl flex items-center gap-2 transition-all text-sm md:text-base">
              <Unlock size={18} /> <span>Abrir Caja</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-surface rounded-xl p-6 border border-foreground/15 relative overflow-hidden shadow-sm">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-xl"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-background p-3 rounded-lg text-primary shadow-inner"><Activity size={24} /></div>
            <h3 className="text-foreground/80 font-medium">Estado de Caja</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isCajaOpen ? "bg-success/100 animate-pulse" : "bg-red-500"}`}></div>
            <p className="text-foreground text-2xl font-bold">{isCajaOpen ? "Operando" : "Cerrada"}</p>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-6 border border-primary/30 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-primary/10 p-3 rounded-lg text-primary"><TrendingUp size={24} /></div>
            <h3 className="text-foreground/80 font-medium">Ventas de Hoy</h3>
          </div>
          <p className="text-primary text-3xl font-bold">${ventasHoy.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 flex flex-col gap-8">
          <div className="bg-surface rounded-xl border border-foreground/15 shadow-sm flex flex-col" style={{ height: "420px" }}>
            <div className="p-6 border-b border-foreground/15 flex items-center justify-between shrink-0">
              <h2 className="text-primary text-xl font-bold">Actividad Reciente</h2>
              <Clock size={20} className="text-foreground/60" />
            </div>
            <div className="p-2 overflow-y-auto flex-1">
              {recentSales.length > 0 ? (
                recentSales.map((sale) => (
                  <div key={sale.id} className="flex flex-col p-4 hover:bg-background/50 rounded-lg transition-colors border-b border-foreground/15 last:border-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-background shadow-inner flex items-center justify-center text-foreground font-bold text-xs">#{sale.id}</div>
                        <div>
                          <p className="text-foreground font-bold">Venta en salón</p>
                          <p className="text-foreground/70 font-medium text-sm">{sale.time} • {sale.items} producto{sale.items !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <span className="text-foreground font-black text-lg">+${sale.total.toFixed(2)}</span>
                    </div>
                    {sale.details.length > 0 && (
                      <div className="ml-14 rounded-lg p-3 border border-foreground/15 bg-background">
                        <p className="text-xs font-bold mb-2 uppercase tracking-wider text-foreground/60">Productos vendidos:</p>
                        <ul className="m-0 p-0 list-none">
                          {sale.details.map((detail, idx) => (
                            <li key={idx} className="flex items-center gap-2 mb-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 inline-block"></span>
                              <span className="text-sm font-semibold text-foreground">{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-foreground/50">
                  <Clock size={48} className="mb-4 opacity-20 text-foreground" />
                  <p className="text-lg text-foreground font-bold">{isCajaOpen ? "No hay operaciones aún" : "La caja está cerrada"}</p>
                  <p className="text-sm mt-1 text-foreground/70 font-medium">{isCajaOpen ? "Las ventas aparecerán aquí" : "Abre la caja para comenzar"}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-foreground/15 p-6 flex flex-col shadow-sm" style={{ height: "420px" }}>
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <Receipt className="text-primary" size={24} />
              <h2 className="text-primary text-xl font-bold">Gastos Fijos</h2>
            </div>
            <div className="overflow-y-auto flex-1 space-y-4">
              {expenses.length === 0 ? (
                <p className="text-foreground/60 text-sm font-medium">Sin gastos configurados</p>
              ) : (
                expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between">
                    <span className="text-foreground/80 font-medium">{expense.name}</span>
                    <span className="text-foreground font-bold">${expense.amount.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-auto pt-6 border-t border-foreground/15 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-foreground/80 font-medium">Total a cubrir:</span>
                <span className="text-foreground font-black">${totalExpenses.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

      <div className="xl:col-span-1 flex flex-col gap-8">
        <div className="bg-surface rounded-xl border border-foreground/15 p-6 flex flex-col shadow-sm" style={{ height: "420px" }}>
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <Clock className="text-foreground" size={24} />
              <h2 className="text-primary text-xl font-bold">Historial de Movimientos</h2>
            </div>
            <div className="overflow-y-auto flex-1 space-y-3">
              {systemLog.length === 0 ? (
                <p className="text-foreground/60 font-medium text-sm">No hay movimientos registrados</p>
              ) : (
                systemLog.map((log) => {
                  const Icon = LOG_ICONS[log.icon] || Clock;
                  return (
                  <div key={log.id} className="bg-background rounded-lg p-3 border border-foreground/15 shadow-sm flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${log.bg} ${log.color} shrink-0 mt-0.5`}><Icon size={16} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-bold">{log.type}</p>
                      <p className="text-foreground/70 font-medium text-xs leading-relaxed">{log.details}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-foreground/80 font-bold text-xs block">{new Date(log.date.replace(" ", "T")).toLocaleDateString("es-AR")}</span>
                      <span className="text-foreground/60 font-medium text-[10px]">{new Date(log.date.replace(" ", "T")).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {showOpenModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl w-full max-w-md border border-surface shadow-2xl">
            <div className="p-6 border-b border-surface">
              <h2 className="text-primary font-bold text-2xl flex items-center gap-2"><Unlock size={24} className="text-success" /> Abrir Caja</h2>
            </div>
            <div className="p-6 space-y-4">
              <label className="text-foreground/80 font-medium text-sm block">Monto inicial en caja (Cambio)</label>
              <input type="number" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} onFocus={(e) => e.target.select()} className="w-full bg-surface text-foreground rounded-xl px-4 py-4 border border-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-bold shadow-sm" placeholder="0.00" step="0.01" min="0" />
            </div>
            <div className="p-6 border-t border-surface flex gap-4">
              <button onClick={() => setShowOpenModal(false)} className="flex-1 bg-surface hover:bg-surface text-foreground font-bold py-4 rounded-xl transition-all shadow-sm">Cancelar</button>
              <button onClick={handleConfirmOpen} className="flex-1 bg-success hover:brightness-125 text-foreground py-4 rounded-xl transition-all">Confirmar Apertura</button>
            </div>
          </div>
        </div>
      )}

      {showClosureModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl w-full max-w-md border border-surface shadow-2xl">
            <div className="p-6 border-b border-surface">
              <h2 className="text-primary font-bold text-2xl flex items-center gap-2"><Lock size={24} className="text-foreground" /> Cierre de Caja</h2>
            </div>
            <div className="p-6">
              <p className="text-foreground/80 font-medium">¿Estás seguro que deseas cerrar la caja? Para ver el resumen detallado dirígete a la pestaña "Caja".</p>
            </div>
            <div className="p-6 border-t border-surface flex gap-4">
              <button onClick={() => setShowClosureModal(false)} className="flex-1 bg-surface hover:bg-surface text-foreground font-bold py-4 rounded-xl transition-all shadow-sm">Cancelar</button>
              <button onClick={handleConfirmClose} className="flex-1 bg-secondary hover:brightness-125 text-foreground font-bold py-4 rounded-xl transition-all shadow-md">Confirmar Cierre</button>
            </div>
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl w-full max-w-md border border-surface shadow-2xl">
            <div className="p-6 border-b border-surface flex items-center justify-between">
              <h2 className="text-primary font-bold text-2xl flex items-center gap-2"><PackageMinus size={24} className="text-primary" /> Retirar Uso Interno</h2>
              <button onClick={() => { setShowWithdrawModal(false); setSearchWithdraw(""); setWithdrawQty(""); }} className="text-foreground/60 hover:text-foreground transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleWithdraw} className="p-6 space-y-4">
              <p className="text-foreground/80 font-medium text-sm mb-4">Seleccioná el producto y la cantidad a retirar para uso del local. Se descuenta en unidades del stock y queda registrado en el historial.</p>
              <div>
                <label className="text-foreground/80 font-bold text-sm block mb-2">Producto</label>
                <input
                  type="text"
                  placeholder="Buscar por nombre..."
                  value={searchWithdraw}
                  onChange={(e) => setSearchWithdraw(e.target.value)}
                  className="w-full bg-surface text-foreground placeholder-foreground/50 rounded-xl px-4 py-3 mb-3 border border-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-bold shadow-sm"
                />
                <select
                  value={withdrawProductId}
                  onChange={(e) => setWithdrawProductId(e.target.value)}
                  className="w-full bg-surface text-foreground rounded-xl px-4 py-3 border border-surface focus:border-primary outline-none font-bold shadow-sm"
                  required
                >
                  <option value="">Seleccione un producto...</option>
                  {products.filter(p => (p.name || "").toLowerCase().includes(searchWithdraw.toLowerCase()) && Number(p.stock) > 0).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {formatStock(p.stock, p.unitsPerPack)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-foreground/80 font-bold text-sm block mb-2">Cantidad a retirar (unidades)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={withdrawQty}
                  onChange={(e) => setWithdrawQty(e.target.value)}
                  className="w-full bg-surface text-foreground rounded-xl px-4 py-3 border border-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-bold shadow-sm"
                  required
                />
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => { setShowWithdrawModal(false); setSearchWithdraw(""); setWithdrawQty(""); }} className="flex-1 bg-surface hover:bg-surface text-foreground font-bold py-4 rounded-xl transition-all shadow-sm">Cancelar</button>
                <button type="submit" disabled={submittingWithdraw || !withdrawProductId || !withdrawQty} className="flex-1 bg-secondary hover:brightness-125 disabled:bg-surface disabled:text-foreground/50 text-foreground font-bold py-4 rounded-xl transition-all shadow-md">{submittingWithdraw ? "Retirando..." : "Confirmar Retiro"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
