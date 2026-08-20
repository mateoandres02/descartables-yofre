import { AuthService } from "../services/auth.service.js";

export const AuthController = {
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },

  async register(req, res) {
    try {
      const { name, email, password, role } = req.body;
      const user = await AuthService.register(name, email, password, role);
      res.status(201).json(user);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || "Error interno." });
    }
  },
};
