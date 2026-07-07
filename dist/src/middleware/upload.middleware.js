"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMagicBytes = exports.memoryUpload = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
];
const storage = multer_1.default.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        cb(null, `${(0, uuid_1.v4)()}${ext}`);
    },
});
exports.upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB max size
    },
    fileFilter: (req, file, cb) => {
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error("Invalid file type"));
        }
    },
});
exports.memoryUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB max size
    },
    fileFilter: (req, file, cb) => {
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error("Invalid file type"));
        }
    },
});
const validateMagicBytes = async (req, res, next) => {
    if (!req.file && (!req.files || (Array.isArray(req.files) && req.files.length === 0))) {
        return next();
    }
    try {
        const { fileTypeFromFile, fileTypeFromBuffer } = await Promise.resolve().then(() => __importStar(require("file-type")));
        const fs = await Promise.resolve().then(() => __importStar(require("fs/promises")));
        const files = req.files
            ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat())
            : req.file ? [req.file] : [];
        for (const file of files) {
            let type;
            if (file.buffer) {
                type = await fileTypeFromBuffer(file.buffer);
            }
            else if (file.path) {
                type = await fileTypeFromFile(file.path);
            }
            if (!type || !allowedMimeTypes.includes(type.mime)) {
                if (file.path) {
                    await fs.unlink(file.path).catch(() => { });
                }
                return res.status(400).json({ message: "Invalid file magic bytes detected. Spoofed content-type." });
            }
            file.mimetype = type.mime;
        }
        next();
    }
    catch (error) {
        console.error("Magic byte validation error:", error);
        const fs = await Promise.resolve().then(() => __importStar(require("fs/promises")));
        const files = req.files
            ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat())
            : req.file ? [req.file] : [];
        for (const file of files) {
            if (file.path)
                await fs.unlink(file.path).catch(() => { });
        }
        return res.status(500).json({ message: "Failed to validate file" });
    }
};
exports.validateMagicBytes = validateMagicBytes;
