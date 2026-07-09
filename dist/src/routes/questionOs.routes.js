"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const questionOs_controller_1 = require("../controllers/questionOs.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Standardize API Namespace: /api/question-os/
router.post('/query', auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, questionOs_controller_1.QuestionOsController.query);
router.post('/bulk', auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, questionOs_controller_1.QuestionOsController.bulkUpdate);
router.get('/properties', auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, questionOs_controller_1.QuestionOsController.getProperties);
router.post('/properties', auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, questionOs_controller_1.QuestionOsController.createProperty);
router.get('/views', auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, questionOs_controller_1.QuestionOsController.getViews);
router.get('/collections', auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, questionOs_controller_1.QuestionOsController.getCollections);
exports.default = router;
