import { SettingsService } from "../services/settings.service.js";

export const SettingsController = {
  async getSuggestedPrices(req, res) {
    try {
      const percents = await SettingsService.getSuggestedPrices();
      res.json({ percents });
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async addSuggestedPrice(req, res) {
    try {
      const { percent } = req.body;
      const result = await SettingsService.addSuggestedPrice(percent);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async removeSuggestedPrice(req, res) {
    try {
      const { percent } = req.params;
      const result = await SettingsService.removeSuggestedPrice(percent);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },
};
