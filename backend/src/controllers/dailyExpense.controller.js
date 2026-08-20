import { DailyExpenseService } from "../services/dailyExpense.service.js";

export const DailyExpenseController = {
  async getAll(req, res) {
    try {
      res.json(await DailyExpenseService.getAll());
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async create(req, res) {
    try {
      const created = await DailyExpenseService.create(req.body);
      res.status(201).json(created);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },
};
