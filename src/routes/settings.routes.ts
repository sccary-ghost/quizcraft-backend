import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getSettings, updateSettings,
  getAIProviders, updateAIProvider,
  getPromptTemplates, updatePromptTemplate,
} from "../controllers/settings.controller";

const router = Router();
router.use(authenticate);

router.get("/",                           getSettings);
router.put("/",                           updateSettings);
router.get("/ai-providers",               getAIProviders);
router.put("/ai-providers/:provider",     updateAIProvider);
router.get("/prompt-templates",           getPromptTemplates);
router.put("/prompt-templates/:id",       updatePromptTemplate);

export default router;
