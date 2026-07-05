"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkDeleteMedia = exports.deleteMedia = exports.downloadMedia = exports.replaceMedia = exports.renameMedia = exports.uploadMedia = exports.listMedia = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const image_size_1 = __importDefault(require("image-size"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const auditLogger_1 = require("../utils/auditLogger");
// Helper to calculate dynamic usages of a media file in active questions
async function getMediaUsages(fileName) {
    const usages = await prisma_1.default.question.findMany({
        where: {
            OR: [
                { question: { contains: fileName } },
                { explanation: { contains: fileName } },
            ],
            isDeleted: false,
        },
        select: {
            id: true,
            question: true,
            explanation: true,
        },
    });
    return usages.map((q) => ({
        id: q.id,
        inQuestion: q.question.includes(fileName),
        inExplanation: q.explanation ? q.explanation.includes(fileName) : false,
    }));
}
// Get all media list
const listMedia = async (req, res) => {
    try {
        const mediaItems = await prisma_1.default.media.findMany({
            orderBy: { createdAt: "desc" },
        });
        const itemsWithUsages = await Promise.all(mediaItems.map(async (item) => {
            const usages = await getMediaUsages(item.fileName);
            return {
                ...item,
                usageCount: usages.length,
                lastUsed: usages.length > 0 ? item.updatedAt : null,
                usages,
            };
        }));
        res.json(itemsWithUsages);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.listMedia = listMedia;
// Upload new media item
const uploadMedia = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const originalName = req.file.originalname;
        const mimeType = req.file.mimetype;
        const fileSize = req.file.size;
        // Extract dimensions using image-size
        let width = 0;
        let height = 0;
        try {
            const dimensions = (0, image_size_1.default)(req.file.buffer);
            width = dimensions.width || 0;
            height = dimensions.height || 0;
        }
        catch (err) {
            console.warn("Could not determine image size:", err);
        }
        // Save to disk
        const fileName = `${Date.now()}-${originalName.replace(/\s+/g, "_")}`;
        const uploadsDir = path_1.default.join(__dirname, "../../uploads");
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        }
        const filePath = path_1.default.join(uploadsDir, fileName);
        fs_1.default.writeFileSync(filePath, req.file.buffer);
        const uploader = req.user?.name || req.user?.email || "Admin";
        const media = await prisma_1.default.media.create({
            data: {
                fileName,
                originalName,
                mimeType,
                fileSize,
                width,
                height,
                uploadedBy: uploader,
            },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Media Uploaded", media.id);
        const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${fileName}`;
        res.json({
            ...media,
            url: imageUrl,
            usageCount: 0,
            usages: [],
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.uploadMedia = uploadMedia;
// Rename user-facing originalName
const renameMedia = async (req, res) => {
    try {
        const id = req.params.id;
        const originalName = req.body.originalName;
        if (!originalName || originalName.trim().length === 0) {
            return res.status(400).json({ message: "originalName is required" });
        }
        const updated = await prisma_1.default.media.update({
            where: { id },
            data: { originalName: originalName.trim() },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Media Renamed", id);
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.renameMedia = renameMedia;
// Replace file content on disk
const replaceMedia = async (req, res) => {
    try {
        const id = req.params.id;
        if (!req.file) {
            return res.status(400).json({ message: "No replacement file provided" });
        }
        const media = await prisma_1.default.media.findUnique({
            where: { id },
        });
        if (!media) {
            return res.status(404).json({ message: "Media item not found" });
        }
        // Overwrite the existing file on disk
        const filePath = path_1.default.join(__dirname, "../../uploads", media.fileName);
        fs_1.default.writeFileSync(filePath, req.file.buffer);
        // Extract new dimensions
        let width = media.width;
        let height = media.height;
        try {
            const dimensions = (0, image_size_1.default)(req.file.buffer);
            width = dimensions.width || 0;
            height = dimensions.height || 0;
        }
        catch (err) {
            console.warn("Could not determine size of replacement image:", err);
        }
        const updated = await prisma_1.default.media.update({
            where: { id },
            data: {
                fileSize: req.file.size,
                width,
                height,
                mimeType: req.file.mimetype,
            },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Media Replaced", id);
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.replaceMedia = replaceMedia;
// Download media trigger
const downloadMedia = async (req, res) => {
    try {
        const id = req.params.id;
        const media = await prisma_1.default.media.findUnique({
            where: { id },
        });
        if (!media) {
            return res.status(404).json({ message: "Media not found" });
        }
        const filePath = path_1.default.join(__dirname, "../../uploads", media.fileName);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ message: "Physical file not found on disk" });
        }
        res.download(filePath, media.originalName);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.downloadMedia = downloadMedia;
// Delete media item
const deleteMedia = async (req, res) => {
    try {
        const id = req.params.id;
        const media = await prisma_1.default.media.findUnique({
            where: { id },
        });
        if (!media) {
            return res.status(404).json({ message: "Media not found" });
        }
        // Enforce check: Do not delete if referenced
        const usages = await getMediaUsages(media.fileName);
        if (usages.length > 0) {
            return res.status(400).json({
                message: "Cannot delete media resource. It is currently referenced in active questions or explanations.",
                usages,
            });
        }
        // Delete physical file
        const filePath = path_1.default.join(__dirname, "../../uploads", media.fileName);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        // Delete db record
        await prisma_1.default.media.delete({
            where: { id },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Media Deleted", id);
        res.json({ message: "Media item deleted successfully." });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteMedia = deleteMedia;
// Bulk delete unreferenced items
const bulkDeleteMedia = async (req, res) => {
    try {
        const ids = req.body.ids;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "ids array is required" });
        }
        const mediaList = await prisma_1.default.media.findMany({
            where: { id: { in: ids } },
        });
        const deletedIds = [];
        const skippedIds = [];
        for (const media of mediaList) {
            const usages = await getMediaUsages(media.fileName);
            if (usages.length > 0) {
                skippedIds.push(media.id);
                continue;
            }
            // Delete physical file
            const filePath = path_1.default.join(__dirname, "../../uploads", media.fileName);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
            // Delete db record
            await prisma_1.default.media.delete({
                where: { id: media.id },
            });
            deletedIds.push(media.id);
        }
        await (0, auditLogger_1.logAuditAction)(req, `Bulk Media Deleted: ${deletedIds.length} items`);
        res.json({
            message: `Successfully deleted ${deletedIds.length} items. Skipped ${skippedIds.length} referenced items.`,
            deletedIds,
            skippedIds,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.bulkDeleteMedia = bulkDeleteMedia;
