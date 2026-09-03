import { CashRegisterService } from "../services/cashRegister.service.js";
import { sendControllerError } from "./controllerError.js";

export const CashRegisterController = {
  async getStatus(req, res) {
    try {
      res.json(await CashRegisterService.getStatus());
    } catch (err) {
      sendControllerError(res, err);
    }
  },

  async open(req, res) {
    try {
      const { initialCash } = req.body;
      const register = await CashRegisterService.open(req.user.id, initialCash);
      res.status(201).json(register);
    } catch (err) {
      sendControllerError(res, err);
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
      sendControllerError(res, err);
    }
  },

  async getClosed(req, res) {
    try {
      res.json(await CashRegisterService.getClosed());
    } catch (err) {
      sendControllerError(res, err);
    }
  },
};
