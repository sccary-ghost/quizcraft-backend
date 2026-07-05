import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  generate, explain, translate, distractors, duplicateCheck,
  ocrClean, grammarFix, difficulty, bloom, similar, improve,
  history, approve, importToBank, reject,
} from "../controllers/ai.controller";

const router = Router();
router.use(authenticate);

router.post("/generate",        generate);
router.post("/explain",         explain);
router.post("/translate",       translate);
router.post("/distractors",     distractors);
router.post("/duplicate-check", duplicateCheck);
router.post("/ocr-clean",       ocrClean);
router.post("/grammar-fix",     grammarFix);
router.post("/difficulty",      difficulty);
router.post("/bloom",           bloom);
router.post("/similar",         similar);
router.post("/improve",         improve);
router.get("/history",          history);
router.post("/approve/:id",     approve);
router.post("/import/:id",      importToBank);
router.delete("/reject/:id",    reject);

export default router;
