"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Require authorization for candidate management
router.use(auth_middleware_1.authenticate);
router.get("/", user_controller_1.listCandidates);
router.get("/:id/profile", user_controller_1.candidateProfile);
router.get("/:id/attempts", user_controller_1.candidateAttempts);
router.put("/:id", user_controller_1.editCandidate);
exports.default = router;
