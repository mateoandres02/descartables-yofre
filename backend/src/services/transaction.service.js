import { TransactionModel } from "../models/transaction.model.js";
import { CashRegisterModel } from "../models/cashRegister.model.js";
import { ProductService } from "./product.service.js";
import { getArgentinaTime } from "../db/timeUtils.js";

export const TransactionService = {
  async create({ total, payments, items }) {
    if (!payments?.length || !items?.length) {
      throw { status: 400, message: "Se requieren pagos e ítems para la transacción." };
    }
    if (total === undefined || total <= 0) {
      throw { status: 400, message: "El total debe ser mayor a cero." };
    }

    const openRegister = await CashRegisterModel.findOpen();
    if (!openRegister) {
      throw { status: 400, message: "No hay una caja abierta. Abra la caja antes de registrar ventas." };
    }

    const { date, time, datetime } = getArgentinaTime();

    const tx = await TransactionModel.create({
      registerId: openRegister.id,
      total: Number(total),
      date,
      time,
      createdAt: datetime,
    });

    const paymentsData = payments.map((p) => ({
      transactionId: tx.id,
      paymentMethodId: p.methodId || null,
      methodName: p.type || p.methodName || "Efectivo",
      baseAmount: Number(p.baseAmount || p.amount),
      surchargePercent: Number(p.surchargePercent || 0),
      amount: Number(p.amount),
    }));

    const itemsData = items.map((i) => ({
      transactionId: tx.id,
      productId: i.productId || null,
      productName: i.name || i.productName,
      price: Number(i.price || 0),
      quantity: Number(i.quantity),
      total: Number(i.total),
    }));

    const createdPayments = await TransactionModel.createPayments(paymentsData);
    const createdItems = await TransactionModel.createItems(itemsData);

    // Descontar stock de cada producto
    for (const item of items) {
      if (item.productId) {
        await ProductService.decrementStock(item.productId, item.quantity);
      }
    }

    return {
      ...tx,
      payments: createdPayments,
      items: createdItems,
    };
  },

  async getByRegisterId(registerId) {
    const txs = await TransactionModel.findByRegisterId(registerId);
    const result = [];

    for (const tx of txs) {
      const payments = await TransactionModel.findPaymentsByTransactionId(tx.id);
      const items = await TransactionModel.findItemsByTransactionId(tx.id);
      result.push({ ...tx, payments, items });
    }

    return result;
  },
};
