import { Router } from "express";
import { upload } from "../middleware/upload.middleware";
import {
  listMedia,
  uploadMedia,
  renameMedia,
  replaceMedia,
  downloadMedia,
  deleteMedia,
  bulkDeleteMedia,
} from "../controllers/media.controller";
import { authenticate, authorizeAdmin } from "../middleware/auth.middleware";

const router = Router();

// Secure all routes with authentication and admin validation
router.use(authenticate, authorizeAdmin);

router.get("/", listMedia);
router.post("/upload", upload.single("file"), uploadMedia);
router.put("/:id/rename", renameMedia);
router.post("/:id/replace", upload.single("file"), replaceMedia);
router.get("/:id/download", downloadMedia);
router.delete("/:id", deleteMedia);
router.post("/bulk-delete", bulkDeleteMedia);

export default router;
