import { CategoryService } from "../services/category.service.js";

export const CategoryController = {
  async getAll(req, res) {
    try {
      res.json(await CategoryService.getAll());
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async create(req, res) {
    try {
      const created = await CategoryService.create(req.body);
      res.status(201).json(created);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async update(req, res) {
    try {
      const updated = await CategoryService.update(req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async remove(req, res) {
    try {
      res.json(await CategoryService.remove(req.params.id));
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },
};
