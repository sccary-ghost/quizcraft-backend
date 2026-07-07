"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_middleware_1 = require("../middleware/upload.middleware");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const rateLimit_middleware_1 = require("../middleware/rateLimit.middleware");
const auth_validation_1 = require("../validations/auth.validation");
const router = (0, express_1.Router)();
router.post("/register", (0, validate_middleware_1.validate)(auth_validation_1.registerSchema), auth_controller_1.register);
router.post("/login", (0, validate_middleware_1.validate)(auth_validation_1.loginSchema), auth_controller_1.login);
router.post("/logout", auth_controller_1.logout);
router.post("/otp/send", rateLimit_middleware_1.otpLimiter, (0, validate_middleware_1.validate)(auth_validation_1.sendOtpSchema), auth_controller_1.sendOtp);
router.get("/me", auth_middleware_1.authenticate, auth_controller_1.getMe);
// ── Candidate Self-Service Routes ────────────────────────────────────────────
router.put("/profile", auth_middleware_1.authenticate, (0, validate_middleware_1.validate)(auth_validation_1.updateProfileSchema), auth_controller_1.updateProfile);
router.put("/change-password", auth_middleware_1.authenticate, (0, validate_middleware_1.validate)(auth_validation_1.changePasswordSchema), auth_controller_1.changePassword);
router.post("/profile-photo", auth_middleware_1.authenticate, upload_middleware_1.upload.single("photo"), upload_middleware_1.validateMagicBytes, auth_controller_1.uploadProfilePhoto);
// Phone change
router.post("/change-mobile/request", auth_middleware_1.authenticate, rateLimit_middleware_1.otpLimiter, (0, validate_middleware_1.validate)(auth_validation_1.requestMobileChangeSchema), auth_controller_1.requestMobileChange);
router.post("/change-mobile/verify", auth_middleware_1.authenticate, (0, validate_middleware_1.validate)(auth_validation_1.verifyMobileChangeSchema), auth_controller_1.verifyMobileChange);
// Email change
router.post("/change-email/request", auth_middleware_1.authenticate, rateLimit_middleware_1.otpLimiter, (0, validate_middleware_1.validate)(auth_validation_1.requestEmailChangeSchema), auth_controller_1.requestEmailChange);
router.post("/change-email/verify", auth_middleware_1.authenticate, (0, validate_middleware_1.validate)(auth_validation_1.verifyEmailChangeSchema), auth_controller_1.verifyEmailChange);
// Active Sessions
router.get("/sessions", auth_middleware_1.authenticate, auth_controller_1.getActiveSessions);
router.delete("/sessions/:id", auth_middleware_1.authenticate, auth_controller_1.revokeSession);
exports.default = router;
