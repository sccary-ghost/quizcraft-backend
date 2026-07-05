import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  addBookmark,
  listBookmarks,
  removeBookmarks,
  resetBookmarkProgress,
  getBookmarkStats,
  recommendedBookmarks,
  submitPracticeAnswer,
  submitPracticeLog,
  getBatchQuestions,
  listCollections,
  addCollection,
  assignBookmarksToCollection,
} from "../controllers/bookmark.controller";

const router = Router();

// Protect all bookmark routes
router.use(authenticate);

router.get("/", listBookmarks);
router.post("/", addBookmark);
router.delete("/", removeBookmarks);
router.post("/:id/reset", resetBookmarkProgress);
router.get("/stats", getBookmarkStats);
router.get("/recommended", recommendedBookmarks);
router.post("/practice/submit", submitPracticeAnswer);
router.post("/practice-log", submitPracticeLog);
router.get("/batch", getBatchQuestions);

// Collections
router.get("/collections", listCollections);
router.post("/collections", addCollection);
router.post("/collections/assign", assignBookmarksToCollection);

export default router;
