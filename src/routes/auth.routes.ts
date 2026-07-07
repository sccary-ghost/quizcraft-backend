import { Router } from "express";
import { upload, validateMagicBytes } from "../middleware/upload.middleware";
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
import { validate } from "../middleware/validate.middleware";
import { otpLimiter } from "../middleware/rateLimit.middleware";
import {
  registerSchema,
  loginSchema,
  sendOtpSchema,
  updateProfileSchema,
  changePasswordSchema,
  requestMobileChangeSchema,
  verifyMobileChangeSchema,
  requestEmailChangeSchema,
  verifyEmailChangeSchema,
} from "../validations/auth.validation";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);
router.post("/otp/send", otpLimiter, validate(sendOtpSchema), sendOtp);
router.get("/me", authenticate, getMe);

// ── Candidate Self-Service Routes ────────────────────────────────────────────
router.put("/profile", authenticate, validate(updateProfileSchema), updateProfile);
router.put("/change-password", authenticate, validate(changePasswordSchema), changePassword);
router.post("/profile-photo", authenticate, upload.single("photo"), validateMagicBytes, uploadProfilePhoto);

// Phone change
router.post("/change-mobile/request", authenticate, otpLimiter, validate(requestMobileChangeSchema), requestMobileChange);
router.post("/change-mobile/verify", authenticate, validate(verifyMobileChangeSchema), verifyMobileChange);

// Email change
router.post("/change-email/request", authenticate, otpLimiter, validate(requestEmailChangeSchema), requestEmailChange);
router.post("/change-email/verify", authenticate, validate(verifyEmailChangeSchema), verifyEmailChange);

// Active Sessions
router.get("/sessions", authenticate, getActiveSessions);
router.delete("/sessions/:id", authenticate, revokeSession);

export default router;
