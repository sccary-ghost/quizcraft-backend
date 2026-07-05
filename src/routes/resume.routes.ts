import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { syncState, claim, getActive } from "../controllers/resume.controller";

const router = Router();

// Protect all routes
router.use(authenticate);

router.get("/active", getActive);
router.post("/:id/sync", syncState);
router.post("/:id/claim", claim);

export default router;
