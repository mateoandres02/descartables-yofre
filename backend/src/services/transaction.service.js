import { TransactionModel } from "../models/transaction.model.js";
import { CashRegisterModel } from "../models/cashRegister.model.js";
import { ProductModel } from "../models/product.model.js";
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

    const itemsData = [];
    const stockDeductions = [];

    for (const i of items) {
      const saleMode = i.saleMode === "paquete" ? "paquete" : "unidad";
      let packSize = 1;
      let productName = i.name || i.productName;

      if (i.productId) {
        const product = await ProductModel.findById(i.productId);
        if (!product) {
          throw { status: 400, message: `Producto no encontrado (id ${i.productId}).` };
        }
        const configuredPack = Number(product.unitsPerPack) || 1;
        if (saleMode === "paquete") {
          if (configuredPack < 2 || product.packPrice == null) {
            throw { status: 400, message: `"${product.name}" no está configurado para venta por paquete.` };
          }
          packSize = configuredPack;
          productName = `${product.name} (paquete x${packSize})`;
          stockDeductions.push({ productId: product.id, units: Number(i.quantity) * packSize });
        } else {
          if (configuredPack > 1) {
            packSize = configuredPack;
            productName = `${product.name} (unidad)`;
          }
          stockDeductions.push({ productId: product.id, units: Number(i.quantity) });
        }
      }

      itemsData.push({
        transactionId: tx.id,
        productId: i.productId || null,
        productName,
        price: Number(i.price || 0),
        quantity: Number(i.quantity),
        total: Number(i.total),
        saleMode,
        packSize,
      });
    }

    const createdPayments = await TransactionModel.createPayments(paymentsData);
    const createdItems = await TransactionModel.createItems(itemsData);

    for (const deduction of stockDeductions) {
      await ProductService.decrementStock(deduction.productId, deduction.units);
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
