"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUploadQuestions = bulkUploadQuestions;
const prisma_1 = __importDefault(require("../utils/prisma"));
async function bulkUploadQuestions(quizId, rows) {
    const validRows = rows.filter((row) => row.question &&
        row.optionA &&
        row.optionB &&
        row.optionC &&
        row.optionD);
    const questions = validRows.map((row) => ({
        quizId,
        question: row.question,
        optionA: row.optionA,
        optionB: row.optionB,
        optionC: row.optionC,
        optionD: row.optionD,
        correctAnswer: row.correctAnswer || "",
    }));
    await prisma_1.default.question.createMany({
        data: questions,
    });
    return {
        message: `${questions.length} questions uploaded successfully`,
    };
}
