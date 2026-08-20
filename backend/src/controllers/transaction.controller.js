import { TransactionService } from "../services/transaction.service.js";

export const TransactionController = {
  async create(req, res) {
    try {
      const result = await TransactionService.create(req.body);
      res.status(201).json(result);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async getByRegisterId(req, res) {
    try {
      const { registerId } = req.params;
      const result = await TransactionService.getByRegisterId(Number(registerId));
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },
};
