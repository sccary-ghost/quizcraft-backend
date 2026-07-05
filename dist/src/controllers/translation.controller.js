"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importTranslations = exports.exportTemplate = exports.getStats = exports.upsertTranslation = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
// 1. Add/Update Translation
const upsertTranslation = async (req, res) => {
    try {
        const questionId = req.params.id;
        const userId = req.user.userId;
        const { language, questionText, explanation, status, options } = req.body;
        if (!language || !questionText || !options || !Array.isArray(options)) {
            return res.status(400).json({ message: "language, questionText, and options list are required" });
        }
        // Fetch parent question
        const question = await prisma_1.default.question.findUnique({
            where: { id: questionId },
        });
        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }
        const targetLang = language;
        // Check existing translation
        const existing = await prisma_1.default.questionTranslation.findUnique({
            where: {
                questionId_language: {
                    questionId,
                    language: targetLang,
                },
            },
            include: { options: true, revisions: true },
        });
        let translation;
        if (existing) {
            // 1. Create a snapshot revision before updating
            const currentOptionsJson = existing.options.reduce((acc, opt) => {
                acc[opt.optionIndex] = opt.text;
                return acc;
            }, {});
            const nextVersion = existing.revisions.length + 1;
            await prisma_1.default.translationRevision.create({
                data: {
                    translationId: existing.id,
                    version: nextVersion,
                    questionText: existing.questionText,
                    explanation: existing.explanation,
                    optionsJson: currentOptionsJson,
                    editedById: userId,
                },
            });
            // 2. Update existing translation fields
            translation = await prisma_1.default.questionTranslation.update({
                where: { id: existing.id },
                data: {
                    questionText,
                    explanation,
                    status: status || client_1.TranslationStatus.DRAFT,
                    translatedById: userId,
                },
            });
            // 3. Update options
            for (let i = 0; i < options.length; i++) {
                await prisma_1.default.questionOptionTranslation.upsert({
                    where: {
                        translationId_optionIndex: {
                            translationId: existing.id,
                            optionIndex: i,
                        },
                    },
                    update: { text: options[i] },
                    create: {
                        translationId: existing.id,
                        optionIndex: i,
                        text: options[i],
                    },
                });
            }
        }
        else {
            // Create new translation
            translation = await prisma_1.default.questionTranslation.create({
                data: {
                    questionId,
                    language: targetLang,
                    questionText,
                    explanation,
                    status: status || client_1.TranslationStatus.DRAFT,
                    translatedById: userId,
                },
            });
            // Create options
            for (let i = 0; i < options.length; i++) {
                await prisma_1.default.questionOptionTranslation.create({
                    data: {
                        translationId: translation.id,
                        optionIndex: i,
                        text: options[i],
                    },
                });
            }
        }
        res.json({ message: "Translation updated successfully", translation });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.upsertTranslation = upsertTranslation;
// 2. Get Translation Stats Dashboard Aggregates
const getStats = async (req, res) => {
    try {
        const totalQuestions = await prisma_1.default.question.count({ where: { isDeleted: false } });
        // Hindi translation counts
        const hTranslations = await prisma_1.default.questionTranslation.findMany({
            where: { language: client_1.Language.HI },
        });
        const approvedCount = hTranslations.filter((t) => t.status === client_1.TranslationStatus.APPROVED).length;
        const draftCount = hTranslations.filter((t) => t.status === client_1.TranslationStatus.DRAFT || t.status === client_1.TranslationStatus.REVIEW).length;
        const missingCount = totalQuestions - hTranslations.length;
        const progressRatio = totalQuestions > 0 ? (hTranslations.length / totalQuestions) * 100 : 0;
        res.json({
            totalQuestions,
            progressRatio,
            approvedCount,
            draftCount,
            missingCount,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getStats = getStats;
// 3. Export Translation CSV/JSON Template
const exportTemplate = async (req, res) => {
    try {
        const questions = await prisma_1.default.question.findMany({
            where: { isDeleted: false },
            include: {
                translations: {
                    where: { language: client_1.Language.HI },
                    include: { options: true },
                },
            },
        });
        const templateData = questions.map((q) => {
            const hiTrans = q.translations[0];
            const hiOpts = hiTrans?.options || [];
            return {
                questionId: q.id,
                subject: q.subject || "",
                english: {
                    questionText: q.question,
                    optionA: q.optionA,
                    optionB: q.optionB,
                    optionC: q.optionC,
                    optionD: q.optionD,
                    explanation: q.explanation || "",
                },
                hindi: {
                    questionText: hiTrans?.questionText || "",
                    optionA: hiOpts.find((o) => o.optionIndex === 0)?.text || "",
                    optionB: hiOpts.find((o) => o.optionIndex === 1)?.text || "",
                    optionC: hiOpts.find((o) => o.optionIndex === 2)?.text || "",
                    optionD: hiOpts.find((o) => o.optionIndex === 3)?.text || "",
                    explanation: hiTrans?.explanation || "",
                    status: hiTrans?.status || "MISSING",
                },
            };
        });
        res.json(templateData);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.exportTemplate = exportTemplate;
// 4. Bulk Import Translations
const importTranslations = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { items } = req.body; // Expect array of formatted objects
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ message: "items list array is required" });
        }
        let successCount = 0;
        for (const item of items) {
            const { questionId, questionText, optionA, optionB, optionC, optionD, explanation, status } = item;
            if (!questionId || !questionText || !optionA)
                continue;
            // Check parent question existence
            const q = await prisma_1.default.question.findUnique({ where: { id: questionId } });
            if (!q)
                continue;
            const existing = await prisma_1.default.questionTranslation.findUnique({
                where: {
                    questionId_language: {
                        questionId,
                        language: client_1.Language.HI,
                    },
                },
            });
            let translationId = "";
            if (existing) {
                const trans = await prisma_1.default.questionTranslation.update({
                    where: { id: existing.id },
                    data: {
                        questionText,
                        explanation,
                        status: status || client_1.TranslationStatus.APPROVED,
                        translatedById: userId,
                    },
                });
                translationId = trans.id;
            }
            else {
                const trans = await prisma_1.default.questionTranslation.create({
                    data: {
                        questionId,
                        language: client_1.Language.HI,
                        questionText,
                        explanation,
                        status: status || client_1.TranslationStatus.APPROVED,
                        translatedById: userId,
                    },
                });
                translationId = trans.id;
            }
            // Upsert options translations
            const opts = [optionA, optionB, optionC, optionD];
            for (let i = 0; i < opts.length; i++) {
                if (opts[i] === undefined || opts[i] === null)
                    continue;
                await prisma_1.default.questionOptionTranslation.upsert({
                    where: {
                        translationId_optionIndex: {
                            translationId,
                            optionIndex: i,
                        },
                    },
                    update: { text: opts[i] },
                    create: {
                        translationId,
                        optionIndex: i,
                        text: opts[i],
                    },
                });
            }
            successCount++;
        }
        res.json({ message: `Successfully imported ${successCount} translations.` });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.importTranslations = importTranslations;
