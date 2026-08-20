import { CashRegisterModel } from "../models/cashRegister.model.js";
import { TransactionModel } from "../models/transaction.model.js";
import { DailyExpenseModel } from "../models/dailyExpense.model.js";
import { getArgentinaTime } from "../db/timeUtils.js";

function buildClosedRegisterSummary(register, txs, payments, items, dailyExpenses) {
  const totalIngresos = txs.reduce((sum, t) => sum + t.total, 0);
  const totalEfectivo = payments
    .filter((p) => p.methodName.toLowerCase() === "efectivo")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalTransferencia = payments
    .filter((p) => p.methodName.toLowerCase() !== "efectivo")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalSurcharges = payments.reduce(
    (sum, p) => sum + (p.amount - p.baseAmount),
    0
  );

  const surchargeBreakdown = {};
  for (const p of payments) {
    if (p.surchargePercent > 0) {
      surchargeBreakdown[p.methodName] =
        (surchargeBreakdown[p.methodName] || 0) + (p.amount - p.baseAmount);
    }
  }

  const soldItemsMap = {};
  for (const item of items) {
    if (!soldItemsMap[item.productName]) {
      soldItemsMap[item.productName] = { name: item.productName, quantity: 0, total: 0 };
    }
    soldItemsMap[item.productName].quantity += item.quantity;
    soldItemsMap[item.productName].total += item.total;
  }

  const totalGastosEfectivo = dailyExpenses
    .filter((e) => e.method === "efectivo")
    .reduce((sum, e) => sum + e.amount, 0);

  return {
    id: register.id,
    openedAt: register.openedAt,
    closedAt: register.closedAt,
    initialCash: register.initialCash,
    transactionsCount: txs.length,
    totalIngresos,
    totalEfectivo,
    totalTransferencia,
    totalSurcharges,
    surchargeBreakdown: Object.entries(surchargeBreakdown).map(([method, amount]) => ({
      method,
      amount,
    })),
    soldItems: Object.values(soldItemsMap),
    dailyExpenses: dailyExpenses.map((e) => ({
      id: e.id,
      reason: e.reason,
      amount: e.amount,
      method: e.method,
      createdAt: e.createdAt,
    })),
    totalGastosEfectivo,
    cashBalance: register.initialCash + totalEfectivo - totalGastosEfectivo,
  };
}

export const CashRegisterService = {
  async getStatus() {
    const register = await CashRegisterModel.findOpen();
    return { isOpen: !!register, register: register || null };
  },

  async open(userId, initialCash) {
    const existing = await CashRegisterModel.findOpen();
    if (existing) throw { status: 409, message: "Ya hay una caja abierta." };

    const amount = Number(initialCash) || 0;
    const { datetime } = getArgentinaTime();
    const register = await CashRegisterModel.create({
      openedBy: userId,
      initialCash: amount,
      isOpen: true,
      openedAt: datetime,
    });
    return register;
  },

  async close(registerId) {
    const register = await CashRegisterModel.findById(registerId);
    if (!register) throw { status: 404, message: "Caja no encontrada." };
    if (!register.isOpen) throw { status: 400, message: "La caja ya está cerrada." };

    const { datetime: closedAt } = getArgentinaTime();
    await CashRegisterModel.update(registerId, { isOpen: false, closedAt });
    return { message: "Caja cerrada correctamente." };
  },

  async getClosed() {
    const closedRegisters = await CashRegisterModel.findClosed();
    const result = [];

    for (const register of closedRegisters) {
      const txs = await TransactionModel.findByRegisterId(register.id);
      const allPayments = [];
      const allItems = [];

      for (const tx of txs) {
        const payments = await TransactionModel.findPaymentsByTransactionId(tx.id);
        const items = await TransactionModel.findItemsByTransactionId(tx.id);
        allPayments.push(...payments);
        allItems.push(...items);
      }

      const dailyExpenses = await DailyExpenseModel.findByRegisterId(register.id);
      result.push(buildClosedRegisterSummary(register, txs, allPayments, allItems, dailyExpenses));
    }

    return result;
  },
};
