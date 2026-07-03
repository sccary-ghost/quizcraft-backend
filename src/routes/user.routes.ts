import { Router } from "express";
import {
  listCandidates,
  candidateProfile,
  candidateAttempts,
  editCandidate,
} from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Require authorization for candidate management
router.use(authenticate);

router.get("/", listCandidates);
router.get("/:id/profile", candidateProfile);
router.get("/:id/attempts", candidateAttempts);
router.put("/:id", editCandidate);

export default router;
