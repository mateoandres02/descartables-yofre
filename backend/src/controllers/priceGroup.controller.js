import { PriceGroupService } from "../services/priceGroup.service.js";

export const PriceGroupController = {
  async getAll(req, res) {
    try {
      res.json(await PriceGroupService.getAll(req.query.type));
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async create(req, res) {
    try {
      const created = await PriceGroupService.create(req.body);
      res.status(201).json(created);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async update(req, res) {
    try {
      res.json(await PriceGroupService.update(req.params.id, req.body));
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async remove(req, res) {
    try {
      res.json(await PriceGroupService.remove(req.params.id));
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async applyIncrease(req, res) {
    try {
      res.json(await PriceGroupService.applyIncrease(req.params.id, req.body));
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },
};
