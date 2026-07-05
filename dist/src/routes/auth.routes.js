"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_middleware_1 = require("../middleware/upload.middleware");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post("/register", auth_controller_1.register);
router.post("/login", auth_controller_1.login);
router.post("/logout", auth_controller_1.logout);
router.post("/otp/send", auth_controller_1.sendOtp);
router.get("/me", auth_middleware_1.authenticate, auth_controller_1.getMe);
// ── Candidate Self-Service Routes ────────────────────────────────────────────
router.put("/profile", auth_middleware_1.authenticate, auth_controller_1.updateProfile);
router.put("/change-password", auth_middleware_1.authenticate, auth_controller_1.changePassword);
router.post("/profile-photo", auth_middleware_1.authenticate, upload_middleware_1.upload.single("photo"), auth_controller_1.uploadProfilePhoto);
// Phone change
router.post("/change-mobile/request", auth_middleware_1.authenticate, auth_controller_1.requestMobileChange);
router.post("/change-mobile/verify", auth_middleware_1.authenticate, auth_controller_1.verifyMobileChange);
// Email change
router.post("/change-email/request", auth_middleware_1.authenticate, auth_controller_1.requestEmailChange);
router.post("/change-email/verify", auth_middleware_1.authenticate, auth_controller_1.verifyEmailChange);
// Active Sessions
router.get("/sessions", auth_middleware_1.authenticate, auth_controller_1.getActiveSessions);
router.delete("/sessions/:id", auth_middleware_1.authenticate, auth_controller_1.revokeSession);
exports.default = router;
