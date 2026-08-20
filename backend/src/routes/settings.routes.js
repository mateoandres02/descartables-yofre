import { Router } from "express";
import { SettingsController } from "../controllers/settings.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();

router.get("/suggested-prices", authenticate, SettingsController.getSuggestedPrices);
router.post("/suggested-prices", authenticate, requireRole("admin"), SettingsController.addSuggestedPrice);
router.delete("/suggested-prices/:percent", authenticate, requireRole("admin"), SettingsController.removeSuggestedPrice);

export default router;
