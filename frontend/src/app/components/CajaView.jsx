import { useState, useEffect, Fragment } from "react";
import { Lock, Calendar, Clock, Unlock, Eye, EyeOff, Banknote } from "lucide-react";
import { toast } from "sonner";
import api from "../../services/api.js";
import { Loader } from "./Loader.jsx";

export function CajaView({ role = "admin", isCajaOpen, register, onOpenCaja, onCloseCaja, transactions, onRefresh }) {
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cajasCerradas, setCajasCerradas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gastosEfectivo, setGastosEfectivo] = useState(0);
  const [showIngresos, setShowIngresos] = useState(false);

  useEffect(() => {
    if (role === "admin") {
      setLoading(true);
      api.get("/cash-register/closed")
        .then((r) => setCajasCerradas(r.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [role, isCajaOpen]);

  useEffect(() => {
    if (isCajaOpen && register?.id) {
      api.get("/daily-expenses")
        .then((r) => {
          const total = r.data
            .filter((g) => g.registerId === register.id && g.method === "efectivo")
            .reduce((sum, g) => sum + Number(g.amount), 0);
          setGastosEfectivo(total);
        })
        .catch(() => setGastosEfectivo(0));
    } else {
      setGastosEfectivo(0);
    }
  }, [isCajaOpen, register?.id, transactions]);

  const totalIngresos = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalEfectivo = transactions.reduce((sum, t) =>
    sum + t.payments.filter((p) => p.type.toLowerCase().includes("efectivo")).reduce((s, p) => s + p.amount, 0), 0
  );
  const totalTransferencia = transactions.reduce((sum, t) =>
    sum + t.payments.filter((p) => !p.type.toLowerCase().includes("efectivo")).reduce((s, p) => s + p.amount, 0), 0
  );

  const handleCloseCaja = async () => {
    try {
      await onCloseCaja();
      setShowClosureModal(false);
      toast.success("Caja cerrada exitosamente", { description: `Total del día: $${totalIngresos.toFixed(2)}` });
      const r = await api.get("/cash-register/closed");
      setCajasCerradas(r.data);
    } catch (err) { toast.error(err.response?.data?.message || "Error al cerrar caja"); }
  };

  const handleConfirmOpen = async () => {
    try {
      await onOpenCaja(Number(openingAmount) || 0);
      setShowOpenModal(false);
      setOpeningAmount("0");
      toast.success("Caja abierta exitosamente");
    } catch (err) { toast.error(err.response?.data?.message || "Error al abrir caja"); }
  };

  const filteredCajas = cajasCerradas.filter((c) => {
    if (!c.closedAt) return false;
    const dateStr = c.closedAt.slice(0, 10);
    if (dateFrom && dateStr < dateFrom) return false;
    if (dateTo && dateStr > dateTo) return false;
    return true;
  });

  const initialCash = register?.initialCash || 0;
  const efectivoFinalDia = initialCash + totalEfectivo - gastosEfectivo;

  return (
    <div className="flex-1 p-4 pb-20 md:p-8 overflow-y-auto relative">
      {loading && <Loader />}
      {role === "cajero" && !isCajaOpen && (
        <div className="absolute inset-0 z-50 backdrop-blur-md bg-[#eceae7]/60 flex items-center justify-center">
          <div className="bg-[#f4f3f0] p-8 rounded-2xl border border-[#e5e7eb] text-center max-w-md shadow-2xl">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={32} /></div>
            <h2 className="text-[#5db8d1] text-2xl font-bold mb-2">Caja Cerrada</h2>
            <p className="text-[#cc679c]/80 font-medium">Pedile al administrador que abra la caja.</p>
          </div>
        </div>
      )}

      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-[#cc679c] font-bold text-2xl md:text-4xl mb-2 flex flex-wrap items-center gap-3 md:gap-4">
            Control de Caja
            {isCajaOpen ? (
              <span className="text-sm bg-green-500/20 text-green-700 px-3 py-1 rounded-full flex items-center gap-2 font-bold shadow-sm">
                <div className="w-2 h-2 rounded-full bg-green-500"></div> Abierta
              </span>
            ) : (
              <span className="text-sm bg-red-500/20 text-red-700 px-3 py-1 rounded-full flex items-center gap-2 font-bold shadow-sm">
                <div className="w-2 h-2 rounded-full bg-red-500"></div> Cerrada
              </span>
            )}
          </h1>
          <p className="text-[#cc679c]/80 font-medium">{isCajaOpen ? "Resumen en vivo de la caja actual" : "Resumen financiero del día"}</p>
        </div>
      </div>

      {isCajaOpen && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-[#f4f3f0] p-4 rounded-xl border border-[#e5e7eb] shadow-sm">
              <p className="text-[#cc679c]/80 font-medium text-sm mb-1">Fondo Inicial</p>
              <p className="text-[#cc679c] font-black text-lg md:text-xl">${initialCash.toFixed(2)}</p>
            </div>
            <div className="bg-[#f4f3f0] p-4 rounded-xl border border-[#e5e7eb] shadow-sm">
              <p className="text-[#cc679c]/80 font-medium text-sm mb-1">Efectivo Cobrado</p>
              <p className="text-green-700 font-black text-lg md:text-xl">${totalEfectivo.toFixed(2)}</p>
            </div>
            <div className="bg-[#f4f3f0] p-4 rounded-xl border border-[#5db8d1]/30 shadow-sm">
              <p className="text-[#5db8d1]/80 font-medium text-sm mb-1">Virtual / Otros</p>
              <p className="text-[#5db8d1] font-black text-lg md:text-xl">${totalTransferencia.toFixed(2)}</p>
            </div>
            <div className="bg-[#f4f3f0] p-4 rounded-xl border border-[#e5e7eb] shadow-sm">
              <p className="text-[#cc679c]/80 font-medium text-sm mb-1">Ventas Totales</p>
              <p className="text-[#cc679c] font-black text-lg md:text-xl">${totalIngresos.toFixed(2)}</p>
            </div>
          </div>

          {/* Tarjeta: Efectivo total para cierre */}
          <div className="mb-8 bg-gradient-to-r from-[#cc679c]/10 to-[#5db8d1]/10 border-2 border-[#cc679c]/30 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#cc679c]/20 flex items-center justify-center shrink-0">
                <Banknote size={24} className="text-[#cc679c]" />
              </div>
              <div>
                <p className="text-[#cc679c] font-bold text-base">Efectivo en caja al cierre del día</p>
                <p className="text-[#cc679c]/60 text-xs font-medium mt-0.5">
                  Fondo inicial ${initialCash.toFixed(2)} + cobrado ${totalEfectivo.toFixed(2)}
                  {gastosEfectivo > 0 && ` − gastos $${gastosEfectivo.toFixed(2)}`}
                </p>
              </div>
            </div>
            <div className="text-right sm:text-right">
              <p className="text-[#cc679c] font-black text-3xl md:text-4xl">${efectivoFinalDia.toFixed(2)}</p>
              <p className="text-[#cc679c]/50 text-xs font-medium mt-0.5">deberías tener en caja</p>
            </div>
          </div>
        </>
      )}

      {role === "admin" ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <h2 className="text-[#5db8d1] font-bold text-lg md:text-2xl">Historial de Cajas Cerradas</h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#cc679c]/70 font-bold text-sm whitespace-nowrap">Desde</span>
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-[#f4f3f0] text-[#cc679c] font-medium rounded-lg px-3 py-2 border border-[#e5e7eb] focus:border-[#cc679c] focus:ring-2 focus:ring-[#cc679c]/20 outline-none text-sm cursor-pointer transition-all shadow-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#cc679c]/70 font-bold text-sm whitespace-nowrap">Hasta</span>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-[#f4f3f0] text-[#cc679c] font-medium rounded-lg px-3 py-2 border border-[#e5e7eb] focus:border-[#cc679c] focus:ring-2 focus:ring-[#cc679c]/20 outline-none text-sm cursor-pointer transition-all shadow-sm"
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => { setDateFrom(""); setDateTo(""); }}
                    className="text-[#cc679c]/60 hover:text-[#cc679c] text-xs font-bold underline transition-colors"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
            {isCajaOpen ? (
              <button onClick={() => setShowClosureModal(true)} className="bg-[#cc679c] hover:bg-[#b85889] text-[#eceae7] font-bold px-4 md:px-6 py-2.5 md:py-3 rounded-xl flex items-center gap-2 transition-all text-sm md:text-base self-start sm:self-auto shadow-md">
                <Lock size={18} /> Cerrar Caja
              </button>
            ) : (
              <button onClick={() => setShowOpenModal(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 md:px-6 py-2.5 md:py-3 rounded-xl flex items-center gap-2 transition-all text-sm md:text-base self-start sm:self-auto shadow-md">
                <Unlock size={18} /> Abrir Caja
              </button>
            )}
          </div>

          <div className="bg-[#f4f3f0] rounded-xl overflow-hidden border border-[#e5e7eb] shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  <th className="text-left text-[#cc679c]/80 font-bold p-4">Fecha</th>
                  <th className="text-left text-[#cc679c]/80 font-bold p-4">Hora Cierre</th>
                  <th className="text-left text-[#cc679c]/80 font-bold p-4">
                    <div className="flex items-center gap-2">
                      Total Ingresos
                      <button onClick={() => setShowIngresos((v) => !v)} title={showIngresos ? "Ocultar" : "Mostrar"} className="text-[#cc679c]/40 hover:text-[#cc679c] transition-colors">
                        {showIngresos ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                    </div>
                  </th>
                  <th className="text-right text-[#cc679c]/80 font-bold p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCajas.length > 0 ? (
                  filteredCajas.map((caja) => (
                    <Fragment key={caja.id}>
                      <tr className={`border-b border-[#e5e7eb] hover:bg-[#eceae7]/50 transition-colors ${expandedId === caja.id ? "bg-[#eceae7]/50" : ""}`}>
                        <td className="p-4"><div className="flex items-center gap-2 text-[#cc679c] font-bold"><Calendar size={16} className="text-[#cc679c]/60" />{caja.closedAt?.split(" ")[0] || "-"}</div></td>
                        <td className="p-4"><div className="flex items-center gap-2 text-[#cc679c] font-bold"><Clock size={16} className="text-[#cc679c]/60" />{caja.closedAt ? new Date(caja.closedAt.replace(" ", "T")).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }) : "-"}</div></td>
                        <td className="p-4">
                          {showIngresos
                            ? <span className="text-[#cc679c] font-black">${Number(caja.totalIngresos || 0).toFixed(2)}</span>
                            : <span className="text-[#cc679c]/30 font-black tracking-widest select-none">••••</span>}
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => setExpandedId(expandedId === caja.id ? null : caja.id)} className="text-[#5db8d1] hover:text-[#4a9bb8] transition-colors p-2"><Eye size={20} /></button>
                        </td>
                      </tr>
                      {expandedId === caja.id && (
                        <tr className="border-b border-[#e5e7eb] bg-[#eceae7]">
                          <td colSpan={4} className="p-6">
                            <h4 className="text-[#5db8d1] font-bold mb-4">Detalle de Caja Cerrada</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                              {[
                                { label: "Fondo Inicial", value: `$${Number(caja.initialCash || 0).toFixed(2)}`, color: "text-[#cc679c]" },
                                { label: "Efectivo de Ventas", value: `$${Number(caja.totalEfectivo || 0).toFixed(2)}`, color: "text-green-600" },
                                { label: "Transferencias / Otros", value: `$${Number(caja.totalTransferencia || 0).toFixed(2)}`, color: "text-[#5db8d1]" },
                                { label: "Total Operaciones", value: caja.transactionsCount, color: "text-[#cc679c]" },
                              ].map(({ label, value, color }) => (
                                <div key={label} className="bg-[#f4f3f0] p-4 rounded-lg border border-[#e5e7eb] shadow-sm">
                                  <p className="text-[#cc679c]/80 font-medium text-sm mb-1">{label}</p>
                                  <p className={`${color} font-black text-lg`}>{value}</p>
                                </div>
                              ))}
                            </div>

                            {/* Desglose de recargos */}
                            {caja.surchargeBreakdown && caja.surchargeBreakdown.length > 0 && (
                              <div className="mt-4 bg-[#e3ac4d]/20 border border-[#e3ac4d]/40 rounded-lg p-4 shadow-sm">
                                <p className="text-[#cc679c] font-bold mb-2">Recargos aplicados</p>
                                <div className="space-y-1">
                                  {caja.surchargeBreakdown.map((s, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                      <span className="text-[#cc679c] font-medium">{s.method}</span>
                                      <span className="text-[#cc679c] font-bold">+${Number(s.amount).toFixed(2)}</span>
                                    </div>
                                  ))}
                                  <div className="flex justify-between text-sm pt-2 border-t border-[#e3ac4d]/40 mt-2">
                                    <span className="text-[#cc679c] font-bold">Total recargos cobrados</span>
                                    <span className="text-[#cc679c] font-black">+${Number(caja.totalSurcharges || 0).toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {caja.soldItems && caja.soldItems.length > 0 && (
                              <div className="mt-6">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="text-[#5db8d1] font-bold">Productos Vendidos</h5>
                                  {caja.totalSurcharges > 0 && (
                                    <span className="text-xs text-[#cc679c]/60 italic font-medium">Los totales son precio base sin recargo</span>
                                  )}
                                </div>
                                <div className="bg-[#f4f3f0] rounded-lg border border-[#e5e7eb] overflow-hidden shadow-sm">
                                  <table className="w-full text-sm">
                                    <thead className="bg-[#e5e7eb]/30">
                                      <tr>
                                        <th className="text-left text-[#cc679c]/80 font-bold p-3">Producto</th>
                                        <th className="text-center text-[#cc679c]/80 font-bold p-3">Cantidad</th>
                                        <th className="text-right text-[#cc679c]/80 font-bold p-3">Subtotal (base)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {caja.soldItems.map((item, idx) => (
                                        <tr key={idx} className="border-t border-[#e5e7eb]/50">
                                          <td className="p-3 text-[#cc679c] font-bold">{item.name}</td>
                                          <td className="p-3 text-center text-[#cc679c]/80 font-medium">{item.quantity}</td>
                                          <td className="p-3 text-right text-[#cc679c] font-bold">${Number(item.total).toFixed(2)}</td>
                                        </tr>
                                      ))}
                                      {/* Fila de subtotal base */}
                                      <tr className="border-t border-[#cc679c]/20 bg-[#eceae7]">
                                        <td className="p-3 text-[#cc679c]/80 font-bold" colSpan={2}>Subtotal productos</td>
                                        <td className="p-3 text-right text-[#cc679c] font-black">
                                          ${caja.soldItems.reduce((s, i) => s + Number(i.total), 0).toFixed(2)}
                                        </td>
                                      </tr>
                                      {caja.totalSurcharges > 0 && (
                                        <tr className="bg-[#eceae7]">
                                          <td className="p-3 text-[#e3ac4d] font-bold" colSpan={2}>Recargos cobrados</td>
                                          <td className="p-3 text-right text-[#e3ac4d] font-black">+${Number(caja.totalSurcharges).toFixed(2)}</td>
                                        </tr>
                                      )}
                                      <tr className="bg-[#eceae7]">
                                        <td className="p-3 text-[#cc679c] font-black text-base" colSpan={2}>Total Ingresos del Día</td>
                                        <td className="p-3 text-right text-[#cc679c] font-black text-base">${Number(caja.totalIngresos || 0).toFixed(2)}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                ) : (
                  <tr><td colSpan={4} className="p-8 text-center text-[#cc679c]/60 font-medium">No se encontraron cajas cerradas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[#5db8d1] font-bold text-2xl">Movimientos de Caja Actual</h2>
          </div>
          <div className="bg-[#f4f3f0] rounded-xl overflow-hidden border border-[#e5e7eb] shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  <th className="text-left text-[#cc679c]/80 font-bold p-4">Hora</th>
                  <th className="text-left text-[#cc679c]/80 font-bold p-4">Método de Pago</th>
                  <th className="text-right text-[#cc679c]/80 font-bold p-4">Total</th>
                  <th className="text-right text-[#cc679c]/80 font-bold p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isCajaOpen && transactions.length > 0 ? (
                  transactions.map((t) => (
                    <Fragment key={t.id}>
                      <tr className={`border-b border-[#e5e7eb] hover:bg-[#eceae7]/50 transition-colors ${expandedId === t.id ? "bg-[#eceae7]/50" : ""}`}>
                        <td className="p-4"><div className="flex items-center gap-2 text-[#cc679c] font-bold"><Clock size={16} className="text-[#cc679c]/60" />{t.time}</div></td>
                        <td className="p-4">
                          <div className="flex gap-2 flex-wrap">
                            {t.payments.map((payment, idx) => {
                              const isEfectivo = payment.type.toLowerCase().includes("efectivo");
                              const hasSurcharge = payment.surchargePercent > 0;
                              return (
                                <span key={idx} className={`px-3 py-1 rounded-full text-sm font-bold shadow-sm flex items-center gap-1 ${isEfectivo ? "bg-green-500/20 text-green-700" : "bg-[#5db8d1]/20 text-[#5db8d1]"}`}>
                                  {payment.type}: ${Number(payment.amount).toFixed(2)}
                                  {hasSurcharge && (
                                    <span className="text-[#cc679c] text-xs opacity-80">(+{payment.surchargePercent}%)</span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="p-4 text-right text-[#cc679c] font-black">${Number(t.total).toFixed(2)}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => setExpandedId(expandedId === t.id ? null : t.id)} className="text-[#5db8d1] hover:text-[#4a9bb8] transition-colors p-2"><Eye size={20} /></button>
                        </td>
                      </tr>
                      {expandedId === t.id && t.items && (
                        <tr className="border-b border-[#e5e7eb] bg-[#eceae7]">
                          <td colSpan={4} className="p-6">
                            <div className="bg-[#f4f3f0] rounded-lg border border-[#e5e7eb] overflow-hidden shadow-sm">
                              <table className="w-full text-sm">
                                <thead className="bg-[#e5e7eb]/30"><tr><th className="text-left text-[#cc679c]/80 font-bold p-3">Producto</th><th className="text-center text-[#cc679c]/80 font-bold p-3">Cant.</th><th className="text-right text-[#cc679c]/80 font-bold p-3">Total</th></tr></thead>
                                <tbody>
                                  {t.items.map((item, idx) => (
                                    <tr key={idx} className="border-t border-[#e5e7eb]/50">
                                      <td className="p-3 text-[#cc679c] font-bold">{item.name}</td>
                                      <td className="p-3 text-center text-[#cc679c]/80 font-medium">{item.quantity}</td>
                                      <td className="p-3 text-right text-[#cc679c] font-bold">${Number(item.total).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                ) : (
                  <tr><td colSpan={3} className="p-8 text-center text-[#cc679c]/60 font-medium">{isCajaOpen ? "Aún no hay movimientos." : "La caja está cerrada."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showClosureModal && (
        <div className="fixed inset-0 bg-[#cc679c]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#eceae7] rounded-2xl w-full max-w-2xl border border-[#f4f3f0] shadow-2xl">
            <div className="p-6 border-b border-[#f4f3f0]"><h2 className="text-[#5db8d1] font-bold text-2xl">Cierre de Caja</h2></div>
            <div className="p-6 space-y-6">
              <div className="bg-[#f4f3f0] rounded-xl p-6 space-y-4 shadow-sm">
                {[
                  { label: "Fecha:", value: new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }) },
                  { label: "Transacciones:", value: transactions.length },
                  { label: "Fondo Inicial:", value: `$${initialCash.toFixed(2)}` },
                  { label: "Efectivo Cobrado (Ventas):", value: `$${totalEfectivo.toFixed(2)}`, color: "text-green-600" },
                  { label: "Efectivo Total en Caja:", value: `$${(totalEfectivo + initialCash).toFixed(2)}`, color: "text-green-600" },
                  { label: "Transferencias / Otros:", value: `$${totalTransferencia.toFixed(2)}`, color: "text-[#5db8d1]" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between pb-4 border-b border-[#e5e7eb]">
                    <span className="text-[#cc679c]/80 font-medium">{label}</span>
                    <span className={`font-bold ${color || "text-[#cc679c]"}`}>{value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[#cc679c] font-bold text-xl">Total del Día:</span>
                  <span className="text-[#cc679c] text-3xl font-black">${totalIngresos.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#f4f3f0] flex gap-4">
              <button onClick={() => setShowClosureModal(false)} className="flex-1 bg-[#f4f3f0] hover:bg-[#e5e7eb] text-[#cc679c] font-bold py-4 rounded-xl transition-all shadow-sm">Cancelar</button>
              <button onClick={handleCloseCaja} className="flex-1 bg-[#cc679c] hover:bg-[#b85889] text-[#eceae7] font-bold py-4 rounded-xl transition-all shadow-md">Confirmar Cierre</button>
            </div>
          </div>
        </div>
      )}

      {showOpenModal && (
        <div className="fixed inset-0 bg-[#cc679c]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#eceae7] rounded-2xl w-full max-w-md border border-[#f4f3f0] shadow-2xl">
            <div className="p-6 border-b border-[#f4f3f0]"><h2 className="text-[#5db8d1] font-bold text-2xl flex items-center gap-2"><Unlock size={24} className="text-green-600" /> Abrir Caja</h2></div>
            <div className="p-6 space-y-4">
              <label className="text-[#cc679c]/80 font-medium text-sm block">Monto inicial en caja (Cambio)</label>
              <input type="number" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} onFocus={(e) => e.target.select()} className="w-full bg-white text-[#cc679c] rounded-xl px-4 py-4 border border-[#f4f3f0] focus:border-[#cc679c] focus:ring-2 focus:ring-[#cc679c]/20 outline-none font-bold shadow-sm transition-all" placeholder="0.00" step="0.01" min="0" />
            </div>
            <div className="p-6 border-t border-[#f4f3f0] flex gap-4">
              <button onClick={() => setShowOpenModal(false)} className="flex-1 bg-[#f4f3f0] hover:bg-[#e5e7eb] text-[#cc679c] font-bold py-4 rounded-xl transition-all shadow-sm">Cancelar</button>
              <button onClick={handleConfirmOpen} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all shadow-md">Confirmar Apertura</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
