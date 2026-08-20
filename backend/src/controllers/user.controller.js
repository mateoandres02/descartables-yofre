import { UserService } from "../services/user.service.js";

export const UserController = {
  async getAll(req, res) {
    try {
      const users = await UserService.getAll();
      res.json(users);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async update(req, res) {
    try {
      const result = await UserService.update(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async remove(req, res) {
    try {
      const result = await UserService.remove(req.params.id, req.user.id);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },
};
