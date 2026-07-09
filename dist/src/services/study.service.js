"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHighlights = exports.addHighlight = exports.getBookmarks = exports.addBookmark = exports.addParagraph = exports.getChapter = exports.addChapter = exports.getStudyMaterials = exports.createStudyMaterial = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const createStudyMaterial = async (data) => {
    return prisma_1.default.studyMaterial.create({
        data: {
            ...data,
            status: client_1.StudyMaterialStatus.DRAFT,
        },
    });
};
exports.createStudyMaterial = createStudyMaterial;
const getStudyMaterials = async (isPublic) => {
    return prisma_1.default.studyMaterial.findMany({
        where: isPublic !== undefined ? { isPublic } : undefined,
        include: { chapters: true },
    });
};
exports.getStudyMaterials = getStudyMaterials;
const addChapter = async (materialId, data) => {
    return prisma_1.default.studyChapter.create({
        data: {
            materialId,
            ...data,
        },
    });
};
exports.addChapter = addChapter;
const getChapter = async (chapterId) => {
    return prisma_1.default.studyChapter.findUnique({
        where: { id: chapterId },
        include: { paragraphs: true },
    });
};
exports.getChapter = getChapter;
const addParagraph = async (chapterId, data) => {
    return prisma_1.default.studyParagraph.create({
        data: {
            chapterId,
            ...data,
        },
    });
};
exports.addParagraph = addParagraph;
const addBookmark = async (userId, chapterId, paragraphId, note) => {
    return prisma_1.default.studyBookmark.create({
        data: {
            userId,
            chapterId,
            paragraphId,
            note,
        },
    });
};
exports.addBookmark = addBookmark;
const getBookmarks = async (userId) => {
    return prisma_1.default.studyBookmark.findMany({
        where: { userId },
        include: { user: { select: { id: true, name: true } } },
    });
};
exports.getBookmarks = getBookmarks;
const addHighlight = async (userId, paragraphId, data) => {
    return prisma_1.default.studyHighlight.create({
        data: {
            userId,
            paragraphId,
            ...data,
        },
    });
};
exports.addHighlight = addHighlight;
const getHighlights = async (userId, paragraphId) => {
    return prisma_1.default.studyHighlight.findMany({
        where: { userId, paragraphId },
    });
};
exports.getHighlights = getHighlights;
