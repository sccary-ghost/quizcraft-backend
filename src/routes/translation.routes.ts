import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  upsertTranslation,
  getStats,
  exportTemplate,
  importTranslations,
} from "../controllers/translation.controller";

const router = Router();

// Require authorization for all translation endpoints
router.use(authenticate);

router.get("/stats", getStats);
router.get("/export", exportTemplate);
router.post("/import", importTranslations);
router.post("/questions/:id", upsertTranslation);

export default router;
