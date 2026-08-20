import { SubscriptionService } from "../services/subscription.service.js";

export const SubscriptionController = {
  async getStatus(req, res) {
    try {
      const status = await SubscriptionService.getStatus();
      res.json(status);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async setCutoffDay(req, res) {
    try {
      const { cutoffDay } = req.body;
      const result = await SubscriptionService.setCutoffDay(cutoffDay);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async reactivate(req, res) {
    try {
      const result = await SubscriptionService.reactivate();
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },
};
