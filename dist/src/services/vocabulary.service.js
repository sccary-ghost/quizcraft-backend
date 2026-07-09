"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFlashcardRevision = exports.getFlashcards = exports.addFlashcard = exports.updateVocabularyStatus = exports.getVocabularyWords = exports.addVocabularyWord = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const addVocabularyWord = async (userId, data) => {
    return prisma_1.default.vocabularyWord.upsert({
        where: {
            userId_word: {
                userId,
                word: data.word,
            },
        },
        update: data,
        create: {
            userId,
            ...data,
        },
    });
};
exports.addVocabularyWord = addVocabularyWord;
const getVocabularyWords = async (userId, status) => {
    return prisma_1.default.vocabularyWord.findMany({
        where: {
            userId,
            ...(status ? { status } : {}),
        },
    });
};
exports.getVocabularyWords = getVocabularyWords;
const updateVocabularyStatus = async (id, status) => {
    return prisma_1.default.vocabularyWord.update({
        where: { id },
        data: { status },
    });
};
exports.updateVocabularyStatus = updateVocabularyStatus;
const addFlashcard = async (userId, data) => {
    return prisma_1.default.flashcard.create({
        data: {
            userId,
            ...data,
        },
    });
};
exports.addFlashcard = addFlashcard;
const getFlashcards = async (userId, materialId) => {
    return prisma_1.default.flashcard.findMany({
        where: {
            userId,
            ...(materialId ? { materialId } : {}),
        },
    });
};
exports.getFlashcards = getFlashcards;
const updateFlashcardRevision = async (id, result) => {
    const flashcard = await prisma_1.default.flashcard.findUnique({ where: { id } });
    if (!flashcard)
        throw new Error("Flashcard not found");
    const newRevisionCount = flashcard.revisionCount + 1;
    const nextDate = new Date();
    if (result) {
        nextDate.setDate(nextDate.getDate() + newRevisionCount * 2);
    }
    else {
        nextDate.setDate(nextDate.getDate() + 1);
    }
    return prisma_1.default.flashcard.update({
        where: { id },
        data: {
            lastRevisionResult: result,
            lastRevisionAt: new Date(),
            revisionCount: newRevisionCount,
            nextRevisionDate: nextDate,
        },
    });
};
exports.updateFlashcardRevision = updateFlashcardRevision;
