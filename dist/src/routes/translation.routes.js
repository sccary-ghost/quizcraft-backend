"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const translation_controller_1 = require("../controllers/translation.controller");
const router = (0, express_1.Router)();
// Require authorization for all translation endpoints
router.use(auth_middleware_1.authenticate);
router.get("/stats", translation_controller_1.getStats);
router.get("/export", translation_controller_1.exportTemplate);
router.post("/import", translation_controller_1.importTranslations);
router.post("/questions/:id", translation_controller_1.upsertTranslation);
exports.default = router;
