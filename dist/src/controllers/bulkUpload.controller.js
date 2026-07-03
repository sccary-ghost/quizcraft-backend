"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadQuestions = void 0;
const parseQuestionText_1 = require("../utils/parseQuestionText");
const prisma_1 = __importDefault(require("../utils/prisma"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const uploadQuestions = async (req, res) => {
    try {
        const { subject, chapter, topic } = req.body;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        let fileContent = "";
        // Agar file PDF hai, toh pdf-parse use karo
        if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
            const pdfData = await (0, pdf_parse_1.default)(file.buffer);
            fileContent = pdfData.text;
        }
        else {
            // Agar CSV ya TXT hai, toh normal buffer to string
            fileContent = file.buffer.toString("utf8");
        }
        // Ab tumhara original parser convert kiye hue text ko parse karega
        const questions = (0, parseQuestionText_1.parseQuestionText)(fileContent);
        if (questions.length === 0) {
            return res.status(400).json({
                message: "No questions extracted. Ensure your PDF has standard numbering like '1.' and options like '(a)'."
            });
        }
        const questionsData = questions.map((q) => ({
            ...q,
            subject: subject || "Uncategorized",
            chapter: chapter || "Uncategorized",
            topic: topic || "Uncategorized",
            isBank: true,
        }));
        await prisma_1.default.question.createMany({ data: questionsData });
        res.json({
            message: "Questions successfully added to Master Bank",
            count: questionsData.length,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.uploadQuestions = uploadQuestions;
