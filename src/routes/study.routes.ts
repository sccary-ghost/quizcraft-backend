import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import * as studyController from "../controllers/study.controller";

const router = Router();

router.use(authenticate);

router.post("/materials", studyController.createMaterial);
router.get("/materials", studyController.getMaterials);

router.post("/materials/:materialId/chapters", studyController.addChapter);
router.get("/chapters/:chapterId", studyController.getChapter);

router.post("/chapters/:chapterId/paragraphs", studyController.addParagraph);

router.post("/bookmarks", studyController.addBookmark);
router.get("/bookmarks", studyController.getBookmarks);

router.post("/paragraphs/:paragraphId/highlights", studyController.addHighlight);
router.get("/highlights", studyController.getHighlights);

export default router;
