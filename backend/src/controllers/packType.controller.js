import { PackTypeService } from "../services/packType.service.js";

export const PackTypeController = {
  async getAll(req, res) {
    try {
      res.json(await PackTypeService.getAll());
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async create(req, res) {
    try {
      const created = await PackTypeService.create(req.body);
      res.status(201).json(created);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async update(req, res) {
    try {
      res.json(await PackTypeService.update(req.params.id, req.body));
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async remove(req, res) {
    try {
      res.json(await PackTypeService.remove(req.params.id));
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },
};
