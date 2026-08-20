import { StatsService } from "../services/stats.service.js";

export const StatsController = {
  async getRestockCost(req, res) {
    try {
      res.json(await StatsService.getRestockCost());
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async getActivityLog(req, res) {
    try {
      res.json(await StatsService.getActivityLog());
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async createStockModification(req, res) {
    try {
      const result = await StatsService.createStockModification(req.body);
      res.status(201).json(result);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async createInternalWithdrawal(req, res) {
    try {
      const result = await StatsService.createInternalWithdrawal(req.body);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },
};
