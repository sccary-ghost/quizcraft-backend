"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const resume_controller_1 = require("../controllers/resume.controller");
const router = (0, express_1.Router)();
// Protect all routes
router.use(auth_middleware_1.authenticate);
router.get("/active", resume_controller_1.getActive);
router.post("/:id/sync", resume_controller_1.syncState);
router.post("/:id/claim", resume_controller_1.claim);
exports.default = router;
