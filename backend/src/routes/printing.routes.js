import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { PrintingController } from "../controllers/printing.controller.js";

const router = Router();
router.post("/authorize-agent", authenticate, PrintingController.authorizeAgent);
export default router;
