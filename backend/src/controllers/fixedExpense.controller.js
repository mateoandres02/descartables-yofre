import { FixedExpenseService } from "../services/fixedExpense.service.js";

export const FixedExpenseController = {
  async getAll(req, res) {
    try {
      res.json(await FixedExpenseService.getAll());
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async create(req, res) {
    try {
      const created = await FixedExpenseService.create(req.body);
      res.status(201).json(created);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async update(req, res) {
    try {
      const updated = await FixedExpenseService.update(req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async remove(req, res) {
    try {
      res.json(await FixedExpenseService.remove(req.params.id));
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },
};
