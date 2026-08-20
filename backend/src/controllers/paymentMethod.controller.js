import { PaymentMethodService } from "../services/paymentMethod.service.js";

export const PaymentMethodController = {
  async getAll(req, res) {
    try {
      res.json(await PaymentMethodService.getAll());
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async create(req, res) {
    try {
      const created = await PaymentMethodService.create(req.body);
      res.status(201).json(created);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async update(req, res) {
    try {
      const updated = await PaymentMethodService.update(req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async remove(req, res) {
    try {
      res.json(await PaymentMethodService.remove(req.params.id));
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },
};
