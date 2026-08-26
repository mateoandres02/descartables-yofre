import { TransactionModel } from "../models/transaction.model.js";
import { CashRegisterModel } from "../models/cashRegister.model.js";
import { ProductModel } from "../models/product.model.js";
import { ProductPriceTierModel } from "../models/productPriceTier.model.js";
import { ProductService } from "./product.service.js";
import { CustomerService } from "./customer.service.js";
import { getArgentinaTime } from "../db/timeUtils.js";
import { isAccountMethod, round2 } from "../constants.js";

export const TransactionService = {
  async create({ total, payments, items, customerId }, userId) {
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

    const paymentsData = payments.map((p) => ({
      paymentMethodId: p.methodId || null,
      methodName: p.type || p.methodName || "Efectivo",
      baseAmount: Number(p.baseAmount || p.amount),
      surchargePercent: Number(p.surchargePercent || 0),
      amount: Number(p.amount),
    }));

    // Lo que se carga a la cuenta es solo la porción fiada, no el total de la venta
    const accountAmount = round2(
      paymentsData
        .filter((p) => isAccountMethod(p.methodName))
        .reduce((sum, p) => sum + p.amount, 0)
    );

    if (accountAmount > 0 && !customerId) {
      throw {
        status: 400,
        message: "Se requiere un cliente para cargar la venta a cuenta corriente.",
      };
    }

    const { date, time, datetime } = getArgentinaTime();

    const tx = await TransactionModel.create({
      registerId: openRegister.id,
      total: Number(total),
      date,
      time,
      createdAt: datetime,
    });

    const itemsData = [];
    const stockDeductions = [];

    for (const i of items) {
      const saleMode = i.saleMode === "paquete" || i.saleMode === "escala" ? i.saleMode : "unidad";
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
            throw { status: 400, message: `"${product.name}" no está configurado para venta por bulto.` };
          }
          packSize = configuredPack;
          const packLabel = product.packTypeName || "paquete";
          productName = `${product.name} (${packLabel} x${packSize})`;
          stockDeductions.push({ productId: product.id, units: Number(i.quantity) * packSize });
        } else if (saleMode === "escala") {
          const tierQty = Number(i.unitsPerPack || i.tierQuantity || i.packSize);
          const tiers = await ProductPriceTierModel.findByProductId(product.id);
          const tier = tiers.find((t) => Number(t.quantity) === tierQty);
          if (!tier || tierQty < 2) {
            throw { status: 400, message: `"${product.name}" no tiene precio para venta por ${tierQty || "esa cantidad"}.` };
          }
          packSize = tierQty;
          productName = `${product.name} (x${packSize})`;
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

    const createdPayments = await TransactionModel.createPayments(
      paymentsData.map((p) => ({ ...p, transactionId: tx.id }))
    );
    const createdItems = await TransactionModel.createItems(itemsData);

    for (const deduction of stockDeductions) {
      await ProductService.decrementStock(deduction.productId, deduction.units);
    }

    if (accountAmount > 0) {
      await CustomerService.chargeSale({
        customerId,
        amount: accountAmount,
        transactionId: tx.id,
        items: itemsData,
        registerId: openRegister.id,
        userId,
      });
    }

    return {
      ...tx,
      customerId: customerId || null,
      accountAmount,
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
