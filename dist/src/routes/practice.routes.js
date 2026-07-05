"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const practice_controller_1 = require("../controllers/practice.controller");
const router = (0, express_1.Router)();
// Protect all routes
router.use(auth_middleware_1.authenticate);
router.post("/generate", practice_controller_1.createSession);
router.get("/stats", practice_controller_1.getStats);
router.get("/recommended", practice_controller_1.getRecommended);
router.get("/session/:id", practice_controller_1.getSessionDetails);
router.post("/session/:id/submit-answer", practice_controller_1.submitSessionAnswer);
router.post("/session/:id/finish", practice_controller_1.finishSession);
exports.default = router;
