"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_middleware_1 = require("../middleware/upload.middleware");
const media_controller_1 = require("../controllers/media.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Secure all routes with authentication and admin validation
router.use(auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin);
router.get("/", media_controller_1.listMedia);
router.post("/upload", upload_middleware_1.upload.single("file"), media_controller_1.uploadMedia);
router.put("/:id/rename", media_controller_1.renameMedia);
router.post("/:id/replace", upload_middleware_1.upload.single("file"), media_controller_1.replaceMedia);
router.get("/:id/download", media_controller_1.downloadMedia);
router.delete("/:id", media_controller_1.deleteMedia);
router.post("/bulk-delete", media_controller_1.bulkDeleteMedia);
exports.default = router;
