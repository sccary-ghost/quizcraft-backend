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
exports.reviewFlashcard = exports.getFlashcards = exports.addFlashcard = exports.updateWordStatus = exports.getWords = exports.addWord = void 0;
const vocabularyService = __importStar(require("../services/vocabulary.service"));
const addWord = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const word = await vocabularyService.addVocabularyWord(userId, req.body);
        res.status(201).json(word);
    }
    catch (error) {
        next(error);
    }
};
exports.addWord = addWord;
const getWords = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const status = req.query.status;
        const words = await vocabularyService.getVocabularyWords(userId, status);
        res.json(words);
    }
    catch (error) {
        next(error);
    }
};
exports.getWords = getWords;
const updateWordStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const word = await vocabularyService.updateVocabularyStatus(id, status);
        res.json(word);
    }
    catch (error) {
        next(error);
    }
};
exports.updateWordStatus = updateWordStatus;
const addFlashcard = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const flashcard = await vocabularyService.addFlashcard(userId, req.body);
        res.status(201).json(flashcard);
    }
    catch (error) {
        next(error);
    }
};
exports.addFlashcard = addFlashcard;
const getFlashcards = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { materialId } = req.query;
        const flashcards = await vocabularyService.getFlashcards(userId, materialId);
        res.json(flashcards);
    }
    catch (error) {
        next(error);
    }
};
exports.getFlashcards = getFlashcards;
const reviewFlashcard = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { result } = req.body; // boolean: true if remembered, false if forgot
        const flashcard = await vocabularyService.updateFlashcardRevision(id, result);
        res.json(flashcard);
    }
    catch (error) {
        next(error);
    }
};
exports.reviewFlashcard = reviewFlashcard;
