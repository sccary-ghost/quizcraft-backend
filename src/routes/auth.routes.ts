import { Router } from "express";
import { upload } from "../middleware/upload.middleware";
import {
  register,
  login,
  logout,
  getMe,
  sendOtp,
  updateProfile,
  changePassword,
  uploadProfilePhoto,
  requestMobileChange,
  verifyMobileChange,
  requestEmailChange,
  verifyEmailChange,
  getActiveSessions,
  revokeSession,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/otp/send", sendOtp);
router.get("/me", authenticate, getMe);

// ── Candidate Self-Service Routes ────────────────────────────────────────────
router.put("/profile", authenticate, updateProfile);
router.put("/change-password", authenticate, changePassword);
router.post("/profile-photo", authenticate, upload.single("photo"), uploadProfilePhoto);

// Phone change
router.post("/change-mobile/request", authenticate, requestMobileChange);
router.post("/change-mobile/verify", authenticate, verifyMobileChange);

// Email change
router.post("/change-email/request", authenticate, requestEmailChange);
router.post("/change-email/verify", authenticate, verifyEmailChange);

// Active Sessions
router.get("/sessions", authenticate, getActiveSessions);
router.delete("/sessions/:id", authenticate, revokeSession);

export default router;
