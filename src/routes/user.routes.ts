import { Router } from "express";
import {
  listCandidates,
  candidateProfile,
  candidateAttempts,
  editCandidate,
  exportUserReportCSV,
  exportUserReportExcel,
} from "../controllers/user.controller";
import { authenticate, authorizeAdmin } from "../middleware/auth.middleware";

const router = Router();

// Require authorization for candidate management (ADMIN only)
router.use(authenticate, authorizeAdmin);

router.get("/", listCandidates);
router.get("/:id/profile", candidateProfile);
router.get("/:id/attempts", candidateAttempts);
router.get("/:id/report/csv", exportUserReportCSV);
router.get("/:id/report/excel", exportUserReportExcel);
router.put("/:id", editCandidate);

export default router;
