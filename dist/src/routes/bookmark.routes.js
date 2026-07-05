"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const bookmark_controller_1 = require("../controllers/bookmark.controller");
const router = (0, express_1.Router)();
// Protect all bookmark routes
router.use(auth_middleware_1.authenticate);
router.get("/", bookmark_controller_1.listBookmarks);
router.post("/", bookmark_controller_1.addBookmark);
router.delete("/", bookmark_controller_1.removeBookmarks);
router.post("/:id/reset", bookmark_controller_1.resetBookmarkProgress);
router.get("/stats", bookmark_controller_1.getBookmarkStats);
router.get("/recommended", bookmark_controller_1.recommendedBookmarks);
router.post("/practice/submit", bookmark_controller_1.submitPracticeAnswer);
router.post("/practice-log", bookmark_controller_1.submitPracticeLog);
router.get("/batch", bookmark_controller_1.getBatchQuestions);
// Collections
router.get("/collections", bookmark_controller_1.listCollections);
router.post("/collections", bookmark_controller_1.addCollection);
router.post("/collections/assign", bookmark_controller_1.assignBookmarksToCollection);
exports.default = router;
