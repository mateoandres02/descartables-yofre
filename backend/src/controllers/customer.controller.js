import { CustomerService } from "../services/customer.service.js";

export const CustomerController = {
  async list(req, res) {
    try {
      res.json(await CustomerService.list({ search: req.query.search }));
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async getByDocument(req, res) {
    try {
      res.json(await CustomerService.getByDocument(req.params.document));
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async create(req, res) {
    try {
      res.status(201).json(await CustomerService.create(req.body));
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async getDetail(req, res) {
    try {
      res.json(await CustomerService.getDetail(req.params.id));
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async registerPayment(req, res) {
    try {
      const result = await CustomerService.registerPayment(
        req.params.id,
        req.body,
        req.user.id
      );
      res.status(201).json(result);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async getPaymentsByRegister(req, res) {
    try {
      res.json(await CustomerService.getPaymentsByRegister(req.params.registerId));
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },
};
