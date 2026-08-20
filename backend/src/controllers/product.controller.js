import { ProductService } from "../services/product.service.js";

export const ProductController = {
  async getAll(req, res) {
    try {
      const products = await ProductService.getAll();
      res.json(products);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async getByCodbarra(req, res) {
    try {
      const product = await ProductService.getByCodbarra(req.params.codbarra);
      res.json(product);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async create(req, res) {
    try {
      const product = await ProductService.create(req.body);
      res.status(201).json(product);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async update(req, res) {
    try {
      const product = await ProductService.update(req.params.id, req.body);
      res.json(product);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async remove(req, res) {
    try {
      const result = await ProductService.remove(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },
};
