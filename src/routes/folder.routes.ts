import { Router } from "express";
import {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  assignQuestions,
} from "../controllers/folder.controller";

const router = Router();

router.get("/", getFolders);
router.post("/", createFolder);
router.put("/:id", updateFolder);
router.delete("/:id", deleteFolder);
router.post("/:id/questions", assignQuestions);

export default router;
