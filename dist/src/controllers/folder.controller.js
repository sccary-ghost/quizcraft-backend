"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignQuestions = exports.deleteFolder = exports.updateFolder = exports.createFolder = exports.getFolders = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const auditLogger_1 = require("../utils/auditLogger");
// Get all folders
const getFolders = async (req, res) => {
    try {
        const folders = await prisma_1.default.folder.findMany({
            include: {
                questions: {
                    select: { id: true },
                },
            },
        });
        res.json(folders);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getFolders = getFolders;
// Create a new folder
const createFolder = async (req, res) => {
    try {
        const name = req.body.name;
        const parentId = req.body.parentId;
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ message: "Folder name is required." });
        }
        const newFolder = await prisma_1.default.folder.create({
            data: {
                name: name.trim(),
                parentId: parentId || null,
            },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Folder Created", newFolder.id);
        res.json(newFolder);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createFolder = createFolder;
// Update/Rename/Move folder
const updateFolder = async (req, res) => {
    try {
        const id = req.params.id;
        const name = req.body.name;
        const parentId = req.body.parentId;
        // Check circular references if parentId is supplied
        if (parentId && parentId === id) {
            return res.status(400).json({ message: "A folder cannot be its own parent." });
        }
        const updatedFolder = await prisma_1.default.folder.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(parentId !== undefined && { parentId: parentId || null }),
            },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Folder Updated", id);
        res.json(updatedFolder);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateFolder = updateFolder;
// Delete a folder
const deleteFolder = async (req, res) => {
    try {
        const id = req.params.id;
        await prisma_1.default.folder.delete({
            where: { id },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Folder Deleted", id);
        res.json({ message: "Folder deleted successfully." });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteFolder = deleteFolder;
// Move questions to folder
const assignQuestions = async (req, res) => {
    try {
        const id = req.params.id; // folderId (can be "root" or null to unassign)
        const questionIds = req.body.questionIds;
        if (!Array.isArray(questionIds) || questionIds.length === 0) {
            return res.status(400).json({ message: "questionIds array is required." });
        }
        const targetFolderId = id === "root" || !id ? null : id;
        await prisma_1.default.question.updateMany({
            where: { id: { in: questionIds } },
            data: {
                folderId: targetFolderId,
            },
        });
        await (0, auditLogger_1.logAuditAction)(req, `Moved ${questionIds.length} questions to folder: ${targetFolderId || "Root"}`);
        res.json({ message: "Questions folder assignments updated successfully." });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.assignQuestions = assignQuestions;
