"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../utils/prisma"));
const router = (0, express_1.Router)();
// Add single question to master question bank
router.post("/add", async (req, res) => {
    try {
        const { question, options, correctAnswer, subject, chapter, topic, explanation } = req.body;
        if (!question || !options || !correctAnswer) {
            return res.status(400).json({ message: "Required fields are missing." });
        }
        const newQuestion = await prisma_1.default.question.create({
            data: {
                question,
                optionA: options.A,
                optionB: options.B,
                optionC: options.C,
                optionD: options.D,
                correctAnswer,
                subject: subject || null,
                chapter: chapter || null,
                topic: topic || null,
                explanation: explanation || null,
                isBank: true,
            },
        });
        res.json({
            message: "Question added successfully to Master Bank.",
            question: newQuestion,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Autocomplete meta endpoints
router.get("/meta/subjects", async (req, res) => {
    try {
        const items = await prisma_1.default.question.findMany({
            where: { isBank: true, subject: { not: null } },
            select: { subject: true },
            distinct: ["subject"],
        });
        const subjects = items.map((i) => i.subject).filter(Boolean);
        res.json(subjects);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.get("/meta/chapters", async (req, res) => {
    try {
        const items = await prisma_1.default.question.findMany({
            where: { isBank: true, chapter: { not: null } },
            select: { chapter: true },
            distinct: ["chapter"],
        });
        const chapters = items.map((i) => i.chapter).filter(Boolean);
        res.json(chapters);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.get("/meta/topics", async (req, res) => {
    try {
        const items = await prisma_1.default.question.findMany({
            where: { isBank: true, topic: { not: null } },
            select: { topic: true },
            distinct: ["topic"],
        });
        const topics = items.map((i) => i.topic).filter(Boolean);
        res.json(topics);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.default = router;
