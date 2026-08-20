import { PaymentMethodModel } from "../models/paymentMethod.model.js";

export const PaymentMethodService = {
  async getAll() {
    return PaymentMethodModel.findAll();
  },

  async create({ name, surcharge }) {
    if (!name?.trim()) throw { status: 400, message: "El nombre es requerido." };
    const surchargeValue = Number(surcharge) || 0;
    if (surchargeValue < 0 || surchargeValue > 100) {
      throw { status: 400, message: "El recargo debe estar entre 0 y 100." };
    }
    const [created] = await PaymentMethodModel.create({ name: name.trim(), surcharge: surchargeValue });
    return created;
  },

  async update(id, { name, surcharge }) {
    const existing = await PaymentMethodModel.findById(id);
    if (!existing) throw { status: 404, message: "Método de pago no encontrado." };

    const updateData = {};
    if (name?.trim()) updateData.name = name.trim();
    if (surcharge !== undefined) {
      const surchargeValue = Number(surcharge);
      if (surchargeValue < 0 || surchargeValue > 100) {
        throw { status: 400, message: "El recargo debe estar entre 0 y 100." };
      }
      updateData.surcharge = surchargeValue;
    }

    const [updated] = await PaymentMethodModel.update(id, updateData);
    return updated;
  },

  async remove(id) {
    const existing = await PaymentMethodModel.findById(id);
    if (!existing) throw { status: 404, message: "Método de pago no encontrado." };
    await PaymentMethodModel.remove(id);
    return { message: "Método de pago eliminado." };
  },
};
