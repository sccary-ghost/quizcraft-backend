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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHighlights = exports.addHighlight = exports.getBookmarks = exports.addBookmark = exports.addParagraph = exports.getChapter = exports.addChapter = exports.getMaterials = exports.createMaterial = void 0;
const studyService = __importStar(require("../services/study.service"));
const createMaterial = async (req, res, next) => {
    try {
        const material = await studyService.createStudyMaterial(req.body);
        res.status(201).json(material);
    }
    catch (error) {
        next(error);
    }
};
exports.createMaterial = createMaterial;
const getMaterials = async (req, res, next) => {
    try {
        const isPublic = req.query.isPublic ? req.query.isPublic === "true" : undefined;
        const materials = await studyService.getStudyMaterials(isPublic);
        res.json(materials);
    }
    catch (error) {
        next(error);
    }
};
exports.getMaterials = getMaterials;
const addChapter = async (req, res, next) => {
    try {
        const { materialId } = req.params;
        const chapter = await studyService.addChapter(materialId, req.body);
        res.status(201).json(chapter);
    }
    catch (error) {
        next(error);
    }
};
exports.addChapter = addChapter;
const getChapter = async (req, res, next) => {
    try {
        const { chapterId } = req.params;
        const chapter = await studyService.getChapter(chapterId);
        if (!chapter) {
            return res.status(404).json({ message: "Chapter not found" });
        }
        res.json(chapter);
    }
    catch (error) {
        next(error);
    }
};
exports.getChapter = getChapter;
const addParagraph = async (req, res, next) => {
    try {
        const { chapterId } = req.params;
        const paragraph = await studyService.addParagraph(chapterId, req.body);
        res.status(201).json(paragraph);
    }
    catch (error) {
        next(error);
    }
};
exports.addParagraph = addParagraph;
const addBookmark = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { chapterId, paragraphId, note } = req.body;
        const bookmark = await studyService.addBookmark(userId, chapterId, paragraphId, note);
        res.status(201).json(bookmark);
    }
    catch (error) {
        next(error);
    }
};
exports.addBookmark = addBookmark;
const getBookmarks = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const bookmarks = await studyService.getBookmarks(userId);
        res.json(bookmarks);
    }
    catch (error) {
        next(error);
    }
};
exports.getBookmarks = getBookmarks;
const addHighlight = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { paragraphId } = req.params;
        const highlight = await studyService.addHighlight(userId, paragraphId, req.body);
        res.status(201).json(highlight);
    }
    catch (error) {
        next(error);
    }
};
exports.addHighlight = addHighlight;
const getHighlights = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { paragraphId } = req.query;
        const highlights = await studyService.getHighlights(userId, paragraphId);
        res.json(highlights);
    }
    catch (error) {
        next(error);
    }
};
exports.getHighlights = getHighlights;
