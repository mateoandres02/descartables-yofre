import { useState } from "react";
import { X, Wallet } from "lucide-react";

export function DailyExpenseModal({ onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("efectivo");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason || !amount || amount <= 0) return;
    setSubmitting(true);
    try {
      await onSubmit({ reason, amount: Number(amount), method });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#cc679c]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#eceae7] rounded-2xl w-full max-w-md border border-[#f4f3f0] shadow-2xl">
        <div className="p-6 border-b border-[#f4f3f0] flex items-center justify-between">
          <h2 className="text-[#5db8d1] font-bold text-2xl flex items-center gap-2">
            <Wallet size={24} className="text-[#e3ac4d]" />
            Registrar Gasto Diario
          </h2>
          <button onClick={onClose} className="text-[#cc679c]/60 hover:text-[#cc679c] transition-colors">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-[#cc679c]/80 font-bold text-sm block mb-2">Motivo de extracción</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Compra de resmas, Pago proveedor..."
              className="w-full bg-white text-[#cc679c] placeholder-[#cc679c]/50 font-bold rounded-xl px-4 py-3 border border-[#f4f3f0] focus:border-[#cc679c] focus:ring-2 focus:ring-[#cc679c]/20 outline-none shadow-sm transition-all"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="text-[#cc679c]/80 font-bold text-sm block mb-2">Monto ($)</label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                // Reemplaza todo lo que no sea número o punto
                const val = e.target.value.replace(/[^0-9.]/g, "");
                setAmount(val === "" ? "" : val.replace(/^0+(?=\d)/, ""));
              }}
              onFocus={(e) => e.target.select()}
              placeholder="0.00"
              className="w-full bg-white text-[#cc679c] font-bold rounded-xl px-4 py-3 border border-[#f4f3f0] focus:border-[#cc679c] focus:ring-2 focus:ring-[#cc679c]/20 outline-none shadow-sm transition-all"
              required
            />
          </div>
          <div>
            <label className="text-[#cc679c]/80 font-bold text-sm block mb-2">Método de extracción</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full bg-white text-[#cc679c] font-bold rounded-xl px-4 py-3 border border-[#f4f3f0] focus:border-[#cc679c] focus:ring-2 focus:ring-[#cc679c]/20 outline-none shadow-sm transition-all"
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>
          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#f4f3f0] hover:bg-[#e5e7eb] text-[#cc679c] font-bold py-4 rounded-xl transition-all shadow-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[#cc679c] hover:bg-[#b85889] disabled:bg-[#f4f3f0] disabled:text-[#cc679c]/50 disabled:cursor-not-allowed text-[#eceae7] font-bold py-4 rounded-xl transition-all shadow-md shadow-[#cc679c]/20"
            >
              {submitting ? "Guardando..." : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}