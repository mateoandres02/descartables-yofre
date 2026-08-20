import { CashRegisterService } from "../services/cashRegister.service.js";

export const CashRegisterController = {
  async getStatus(req, res) {
    try {
      res.json(await CashRegisterService.getStatus());
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async open(req, res) {
    try {
      const { initialCash } = req.body;
      const register = await CashRegisterService.open(req.user.id, initialCash);
      res.status(201).json(register);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async close(req, res) {
    try {
      const { registerId } = req.body;
      if (!registerId) {
        return res.status(400).json({ message: "registerId es requerido." });
      }
      const result = await CashRegisterService.close(registerId);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async getClosed(req, res) {
    try {
      res.json(await CashRegisterService.getClosed());
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },
};
