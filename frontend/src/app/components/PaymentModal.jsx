import { useState } from "react";
import { X, Printer, Tag } from "lucide-react";

export function PaymentModal({ total, paymentMethods, onClose, onConfirm }) {
  const [payments, setPayments] = useState([
    { methodId: String(paymentMethods[0]?.id || ""), amount: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null); // número 0-100 o null

  const applyDiscount = () => {
    const val = parseFloat(discountInput);
    if (isNaN(val) || val < 0 || val > 100) return;
    setAppliedDiscount(val);
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountInput("");
  };

  const discountedTotal = appliedDiscount !== null
    ? Math.round((total * (1 - appliedDiscount / 100)) * 100) / 100
    : total;
  const discountAmount = total - discountedTotal;

  const getSurcharge = (methodId) => {
    const m = paymentMethods.find((m) => String(m.id) === String(methodId));
    return m?.surcharge || 0;
  };

  const getMethodName = (methodId) => {
    const m = paymentMethods.find((m) => String(m.id) === String(methodId));
    return m?.name || "";
  };

  const isCash = (methodId) =>
    getMethodName(methodId).toLowerCase().includes("efectivo");

  const addPaymentMethod = () => {
    const usedIds = payments.map((p) => p.methodId);
    const nextMethod = paymentMethods.find((m) => !usedIds.includes(String(m.id)));
    if (!nextMethod) return;
    setPayments([...payments, { methodId: String(nextMethod.id), amount: "" }]);
  };

  const availableMethodsFor = (index) =>
    paymentMethods.filter(
      (m) =>
        String(m.id) === payments[index].methodId ||
        !payments.some((p, i) => i !== index && String(p.methodId) === String(m.id))
    );

  const updatePayment = (index, field, value) => {
    const newPayments = [...payments];
    if (field === "methodId") {
      newPayments[index].methodId = value;
    } else {
      // Fix 3: eliminar ceros a la izquierda al escribir
      newPayments[index].amount = value === "" ? "" : value.replace(/^0+(?=\d)/, "");
    }
    setPayments(newPayments);
  };

  const removePayment = (index) => {
    if (payments.length > 1) setPayments(payments.filter((_, i) => i !== index));
  };

  const paidBaseTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingBase = discountedTotal - paidBaseTotal;

  // para efectivo se permite pagar de más (hay vuelto), para otros métodos debe ser exacto
  const allCash = payments.every((p) => isCash(p.methodId));
  const canConfirm = allCash
    ? paidBaseTotal >= discountedTotal
    : Math.abs(remainingBase) < 0.01;

  const change = allCash && paidBaseTotal > discountedTotal ? paidBaseTotal - discountedTotal : 0;

  const finalTotalWithSurcharges = payments.reduce((sum, p) => {
    const amt = Number(p.amount) || 0;
    const surcharge = getSurcharge(p.methodId);
    return sum + amt * (1 + surcharge / 100);
  }, 0);

  // Solo mostrar fila de recargos si al menos un método activo tiene recargo > 0
  const hasActiveSurcharge = payments.some(
    (p) => getSurcharge(p.methodId) > 0 && (Number(p.amount) || 0) > 0
  );

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(
        payments.map((p) => {
          const surcharge = getSurcharge(p.methodId);
          const base = isCash(p.methodId) && payments.length === 1
            ? discountedTotal
            : (Number(p.amount) || 0);
          const withSurcharge = base * (1 + surcharge / 100);
          return {
            methodId: p.methodId,
            type: getMethodName(p.methodId),
            baseAmount: base,
            surchargePercent: surcharge,
            amount: withSurcharge,
            finalAmount: withSurcharge,
          };
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#cc679c]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#eceae7] rounded-2xl w-full max-w-2xl border border-[#f4f3f0] shadow-2xl">
        <div className="p-6 border-b border-[#f4f3f0] flex items-center justify-between">
          <h2 className="text-[#5db8d1] font-bold text-2xl">Procesar Pago</h2>
          <button onClick={onClose} className="text-[#cc679c]/60 hover:text-[#cc679c] transition-colors"><X size={24} /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-[#f4f3f0] rounded-xl p-6 space-y-3 shadow-sm border border-[#e5e7eb]">
            {/* Total original */}
            <div className="flex items-center justify-between">
              <span className="text-[#cc679c]/80 font-medium">Total a cobrar:</span>
              <span className={`text-2xl font-black ${appliedDiscount !== null ? "line-through text-[#cc679c]/40 text-lg" : "text-[#cc679c]"}`}>
                ${total.toFixed(2)}
              </span>
            </div>

            {/* Sección descuento */}
            <div className="pt-2 border-t border-[#e5e7eb]">
              {appliedDiscount === null ? (
                /* Input para ingresar descuento */
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-[#cc679c]/50 shrink-0" />
                  <span className="text-[#cc679c]/70 font-medium text-sm shrink-0">Descuento:</span>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => e.key === "Enter" && applyDiscount()}
                      placeholder="0"
                      min="0"
                      max="100"
                      step="1"
                      className="w-full bg-white text-[#cc679c] font-bold rounded-lg px-3 py-2 pr-7 border border-[#e5e7eb] focus:border-[#cc679c] focus:ring-2 focus:ring-[#cc679c]/20 outline-none shadow-sm text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#cc679c]/50 font-bold text-sm">%</span>
                  </div>
                  <button
                    onClick={applyDiscount}
                    disabled={!discountInput || parseFloat(discountInput) <= 0 || parseFloat(discountInput) > 100}
                    className="bg-[#cc679c] hover:bg-[#b85889] disabled:bg-[#e5e7eb] disabled:text-[#cc679c]/40 text-white font-bold px-4 py-2 rounded-lg text-sm transition-all shadow-sm shrink-0"
                  >
                    Aplicar
                  </button>
                </div>
              ) : (
                /* Descuento aplicado */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-green-600 shrink-0" />
                      <span className="text-green-600 font-bold text-sm">Descuento {appliedDiscount}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-green-600 font-bold">-${discountAmount.toFixed(2)}</span>
                      <button
                        onClick={removeDiscount}
                        className="text-[#cc679c]/40 hover:text-red-500 transition-colors"
                        title="Quitar descuento"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                    <span className="text-green-700 font-bold text-sm">Total con descuento:</span>
                    <span className="text-green-700 text-2xl font-black">${discountedTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {hasActiveSurcharge && (
              <div className="flex items-center justify-between pt-2 border-t border-[#e5e7eb]">
                <span className="text-[#e3ac4d] font-bold">Total con recargos:</span>
                <span className="text-[#e3ac4d] text-2xl font-black">${finalTotalWithSurcharges.toFixed(2)}</span>
              </div>
            )}

            {/* Estado del pago */}
            {paidBaseTotal > 0 && (
              <div className="pt-2 border-t border-[#e5e7eb]">
                {remainingBase > 0.01 ? (
                  // Falta plata — cualquier método
                  <div className="flex items-center justify-between">
                    <span className="text-[#e3ac4d] font-bold">Falta cubrir:</span>
                    <span className="text-[#cc679c] font-bold">${remainingBase.toFixed(2)}</span>
                  </div>
                ) : remainingBase < -0.01 && allCash ? (
                  // Pagó de más en efectivo → vuelto permitido
                  <div className="flex items-center justify-between">
                    <span className="text-green-600 font-bold">Vuelto a entregar:</span>
                    <span className="text-green-600 text-xl font-black">${change.toFixed(2)}</span>
                  </div>
                ) : remainingBase < -0.01 && !allCash ? (
                  // Pagó de más con no-efectivo → error
                  <div className="flex items-center justify-between">
                    <span className="text-red-500 font-bold">Monto excedido en:</span>
                    <span className="text-red-500 font-black">${Math.abs(remainingBase).toFixed(2)}</span>
                  </div>
                ) : (
                  // Monto exacto
                  <div className="flex items-center justify-between">
                    <span className="text-green-600 font-bold">Monto exacto</span>
                    <span className="text-green-600 font-black">✓</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[#cc679c] font-bold">Métodos de Pago</h3>
              {payments.length < paymentMethods.length && (
                <button
                  onClick={addPaymentMethod}
                  className="text-[#e3ac4d] font-bold hover:text-[#cc679c] text-sm transition-colors"
                >
                  + Agregar Método
                </button>
              )}
            </div>

            {payments.map((payment, index) => {
              const surcharge = getSurcharge(payment.methodId);
              const amountNum = Number(payment.amount) || 0;
              const surchargeAmount = amountNum * (surcharge / 100);
              const isThisCash = isCash(payment.methodId);

              return (
                <div key={index} className="bg-[#f4f3f0] border border-[#e5e7eb] shadow-sm rounded-lg p-4 flex gap-4 items-start">
                  <div className="flex-1">
                    <select
                      value={payment.methodId}
                      onChange={(e) => updatePayment(index, "methodId", e.target.value)}
                      className="w-full bg-[#eceae7] text-[#cc679c] font-bold rounded-lg px-4 py-3 border border-[#e5e7eb] focus:border-[#cc679c] outline-none shadow-sm"
                    >
                      {availableMethodsFor(index).map((m) => (
                        <option key={m.id} value={String(m.id)}>
                          {m.name} {m.surcharge > 0 ? `(+${m.surcharge}%)` : ""}
                        </option>
                      ))}
                    </select>
                    {!isThisCash && payments.length > 1 && (
                      <p className="text-[#cc679c]/60 font-medium text-xs mt-1 ml-1">Monto exacto requerido</p>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cc679c]/60 font-bold">$</span>
                      <input
                        type="number"
                        value={payment.amount}
                        onChange={(e) => updatePayment(index, "amount", e.target.value)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0.00"
                        className="w-full bg-[#eceae7] text-[#cc679c] font-bold rounded-lg pl-8 pr-4 py-3 border border-[#e5e7eb] focus:border-[#cc679c] focus:ring-2 focus:ring-[#cc679c]/20 outline-none shadow-sm"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    {surcharge > 0 && amountNum > 0 && (
                      <p className="text-[#e3ac4d] font-bold text-xs mt-2 ml-1">+ recargo: ${surchargeAmount.toFixed(2)}</p>
                    )}
                  </div>

                  {payments.length > 1 && (
                    <button onClick={() => removePayment(index)} className="text-[#cc679c]/50 hover:text-red-500 p-3 transition-colors mt-1">
                      <X size={20} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t border-[#f4f3f0] flex gap-4">
          <button onClick={onClose} className="flex-1 bg-[#f4f3f0] hover:bg-[#e5e7eb] text-[#cc679c] font-bold py-4 rounded-xl transition-all shadow-sm">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || submitting}
            className="flex-1 bg-[#cc679c] hover:bg-[#b85889] disabled:bg-[#f4f3f0] disabled:text-[#cc679c]/50 disabled:cursor-not-allowed text-[#eceae7] font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-[#cc679c]/20"
          >
            <Printer size={20} />
            {submitting ? "Registrando..." : change > 0 ? `Confirmar — Dar vuelto $${change.toFixed(2)}` : "Confirmar e Imprimir Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}
