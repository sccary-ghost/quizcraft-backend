"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startQuizAttempt = exports.updateQuiz = exports.restoreQuiz = exports.moveQuizToTrash = exports.deleteQuestion = exports.updateQuestion = exports.getUserHistory = exports.getAttemptById = exports.submitQuiz = exports.getAllQuizzes = exports.getQuizById = exports.addQuestion = exports.createQuiz = exports.updateQuizStatuses = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const updateQuizStatuses = async () => {
    try {
        const now = new Date();
        const quizzes = await prisma_1.default.quiz.findMany({
            where: {
                isDeleted: false,
                NOT: {
                    status: "Draft",
                },
            },
        });
        for (const quiz of quizzes) {
            let computedStatus = quiz.status;
            if (quiz.availabilityMode === "IMMEDIATE") {
                if (quiz.status !== "Archived") {
                    computedStatus = "Live";
                }
            }
            else if (quiz.availabilityMode === "SCHEDULED" && quiz.startDate) {
                const start = new Date(quiz.startDate);
                const end = quiz.endDate ? new Date(quiz.endDate) : null;
                if (now < start) {
                    computedStatus = "Scheduled";
                }
                else if (end && now > end) {
                    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    if (end < oneDayAgo) {
                        computedStatus = "Archived";
                    }
                    else {
                        computedStatus = "Completed";
                    }
                }
                else {
                    computedStatus = "Live";
                }
            }
            if (computedStatus !== quiz.status) {
                await prisma_1.default.quiz.update({
                    where: { id: quiz.id },
                    data: { status: computedStatus },
                });
            }
        }
    }
    catch (e) {
        console.error("Failed to auto-update quiz statuses:", e);
    }
};
exports.updateQuizStatuses = updateQuizStatuses;
const createQuiz = async (title, description, duration, sections, schedulingData) => {
    const quiz = await prisma_1.default.quiz.create({
        data: {
            title,
            description,
            duration,
            startDate: schedulingData?.startDate ? new Date(schedulingData.startDate) : null,
            endDate: schedulingData?.endDate ? new Date(schedulingData.endDate) : null,
            timezone: schedulingData?.timezone || "Asia/Kolkata",
            status: schedulingData?.status || "Draft",
            resumeAllowed: schedulingData?.resumeAllowed ?? true,
            availabilityMode: schedulingData?.availabilityMode || "IMMEDIATE",
            hideUntilStart: schedulingData?.hideUntilStart ?? false,
            autoCloseAfterEnd: schedulingData?.autoCloseAfterEnd ?? false,
            sections: sections ? {
                create: sections.map((sec) => ({
                    name: sec.name,
                    description: sec.description || null,
                    instructions: sec.instructions || null,
                    order: sec.order || 0,
                    marks: sec.marks ?? 4.0,
                    negativeMarks: sec.negativeMarks ?? 1.0,
                    shuffleQuestions: sec.shuffleQuestions ?? false,
                    shuffleOptions: sec.shuffleOptions ?? false,
                }))
            } : undefined
        },
        include: {
            sections: true
        }
    });
    return { message: "Quiz created successfully", quiz };
};
exports.createQuiz = createQuiz;
const addQuestion = async (quizId, question, optionA, optionB, optionC, optionD, correctAnswer, explanation, subject, chapter, topic, sectionId) => {
    const newQuestion = await prisma_1.default.question.create({
        data: {
            quizId,
            sectionId: sectionId || null,
            question,
            optionA,
            optionB,
            optionC,
            optionD,
            correctAnswer,
            explanation: explanation || null,
            subject: subject || null,
            chapter: chapter || null,
            topic: topic || null,
        },
    });
    return { message: "Question added successfully", question: newQuestion };
};
exports.addQuestion = addQuestion;
const getQuizById = async (quizId) => {
    await (0, exports.updateQuizStatuses)();
    return prisma_1.default.quiz.findUnique({
        where: { id: quizId },
        include: {
            questions: true,
            sections: {
                orderBy: {
                    order: "asc"
                }
            }
        },
    });
};
exports.getQuizById = getQuizById;
const getAllQuizzes = async () => {
    await (0, exports.updateQuizStatuses)();
    return prisma_1.default.quiz.findMany({
        where: {
            isDeleted: false,
        },
        include: {
            questions: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
};
exports.getAllQuizzes = getAllQuizzes;
const getQuestionScoreConfig = (quiz, question) => {
    if (question.sectionId && quiz.sections) {
        const section = quiz.sections.find((s) => s.id === question.sectionId);
        if (section) {
            return {
                marks: section.marks ?? 4.0,
                negativeMarks: section.negativeMarks ?? 1.0
            };
        }
    }
    if (quiz.description) {
        try {
            const parsed = JSON.parse(quiz.description);
            const config = parsed.questionConfigs?.[question.id];
            if (config) {
                return {
                    marks: config.marks ?? 4.0,
                    negativeMarks: config.negativeMarks ?? 1.0
                };
            }
        }
        catch (e) {
            // ignore
        }
    }
    return { marks: 4.0, negativeMarks: 1.0 };
};
const submitQuiz = async (userId, quizId, answers, questionTimes = {}) => {
    const quiz = await prisma_1.default.quiz.findUnique({
        where: { id: quizId },
        include: {
            questions: true,
            sections: true
        },
    });
    if (!quiz)
        throw new Error("Quiz not found");
    let score = 0;
    let maxScore = 0;
    quiz.questions.forEach((question, index) => {
        const { marks, negativeMarks } = getQuestionScoreConfig(quiz, question);
        maxScore += marks;
        const selectedIndex = answers[index];
        if (selectedIndex === null || selectedIndex === undefined)
            return;
        const options = [question.optionA, question.optionB, question.optionC, question.optionD];
        const selectedText = options[selectedIndex]?.trim();
        const correctText = question.correctAnswer?.trim();
        if (selectedText && correctText && selectedText === correctText) {
            score += marks;
        }
        else if (selectedText) {
            score -= negativeMarks;
        }
    });
    const total = quiz.questions.length;
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    // Find an existing in-progress attempt to update
    let attempt = await prisma_1.default.attempt.findFirst({
        where: {
            userId,
            quizId,
            completed: false,
        },
    });
    if (attempt) {
        attempt = await prisma_1.default.attempt.update({
            where: { id: attempt.id },
            data: { score, percentage, completed: true, submittedAt: new Date() },
        });
        // Clear any previous answers for this attempt in case it was resumed
        await prisma_1.default.answer.deleteMany({
            where: { attemptId: attempt.id },
        });
    }
    else {
        attempt = await prisma_1.default.attempt.create({
            data: { userId, quizId, score, percentage, completed: true },
        });
    }
    await prisma_1.default.answer.createMany({
        data: quiz.questions.map((question, index) => {
            const selectedIndex = answers[index];
            const options = [question.optionA, question.optionB, question.optionC, question.optionD];
            const selectedAnswer = selectedIndex === null || selectedIndex === undefined ? null : options[selectedIndex];
            const isCorrect = !!selectedAnswer && !!question.correctAnswer && selectedAnswer.trim() === question.correctAnswer.trim();
            return {
                attemptId: attempt.id,
                questionId: question.id,
                selectedAnswer,
                isCorrect,
                timeSpent: questionTimes[index] || 0,
            };
        }),
    });
    return { score, total, percentage, attemptId: attempt.id };
};
exports.submitQuiz = submitQuiz;
const getAttemptById = async (attemptId) => {
    return prisma_1.default.attempt.findUnique({
        where: { id: attemptId },
        include: {
            answers: {
                include: {
                    question: {
                        include: {
                            section: true
                        }
                    }
                }
            },
            quiz: {
                include: {
                    sections: {
                        orderBy: {
                            order: "asc"
                        }
                    }
                }
            },
        },
    });
};
exports.getAttemptById = getAttemptById;
const getUserHistory = async (userId) => {
    // Return completed attempts or all? Completed is better so unfinished aren't shown as completed score 0 tests.
    return prisma_1.default.attempt.findMany({
        where: { userId, completed: true },
        include: { quiz: true },
        orderBy: { submittedAt: "desc" },
    });
};
exports.getUserHistory = getUserHistory;
const updateQuestion = async (questionId, question, optionA, optionB, optionC, optionD, correctAnswer) => {
    return prisma_1.default.question.update({
        where: { id: questionId },
        data: { question, optionA, optionB, optionC, optionD, correctAnswer },
    });
};
exports.updateQuestion = updateQuestion;
const deleteQuestion = async (questionId) => {
    return prisma_1.default.question.delete({
        where: { id: questionId },
    });
};
exports.deleteQuestion = deleteQuestion;
const moveQuizToTrash = async (quizId) => {
    return prisma_1.default.quiz.update({
        where: {
            id: quizId,
        },
        data: {
            isDeleted: true,
            deletedAt: new Date(),
        },
    });
};
exports.moveQuizToTrash = moveQuizToTrash;
const restoreQuiz = async (quizId) => {
    return prisma_1.default.quiz.update({
        where: {
            id: quizId,
        },
        data: {
            isDeleted: false,
            deletedAt: null,
        },
    });
};
exports.restoreQuiz = restoreQuiz;
const updateQuiz = async (quizId, title, description, duration, sections, schedulingData) => {
    const quiz = await prisma_1.default.quiz.update({
        where: { id: quizId },
        data: {
            title,
            description,
            duration,
            startDate: schedulingData?.startDate ? new Date(schedulingData.startDate) : null,
            endDate: schedulingData?.endDate ? new Date(schedulingData.endDate) : null,
            timezone: schedulingData?.timezone || "Asia/Kolkata",
            status: schedulingData?.status || "Draft",
            resumeAllowed: schedulingData?.resumeAllowed ?? true,
            availabilityMode: schedulingData?.availabilityMode || "IMMEDIATE",
            hideUntilStart: schedulingData?.hideUntilStart ?? false,
            autoCloseAfterEnd: schedulingData?.autoCloseAfterEnd ?? false,
        },
    });
    if (sections) {
        await prisma_1.default.section.deleteMany({
            where: { quizId },
        });
        await prisma_1.default.section.createMany({
            data: sections.map((sec, idx) => ({
                quizId,
                name: sec.name,
                description: sec.description || null,
                instructions: sec.instructions || null,
                order: sec.order ?? idx,
                marks: sec.marks ?? 4.0,
                negativeMarks: sec.negativeMarks ?? 1.0,
                shuffleQuestions: sec.shuffleQuestions ?? false,
                shuffleOptions: sec.shuffleOptions ?? false,
            })),
        });
    }
    return { message: "Quiz updated successfully", quiz };
};
exports.updateQuiz = updateQuiz;
const startQuizAttempt = async (userId, quizId) => {
    await (0, exports.updateQuizStatuses)();
    const quiz = await prisma_1.default.quiz.findUnique({
        where: { id: quizId },
    });
    if (!quiz)
        throw new Error("Quiz not found");
    const now = new Date();
    // If status is Draft, block students
    if (quiz.status === "Draft") {
        throw new Error("This test is currently a draft and cannot be attempted.");
    }
    // Validate start and end times
    if (quiz.availabilityMode === "SCHEDULED") {
        if (quiz.startDate && now < new Date(quiz.startDate)) {
            throw new Error("This test has not started yet.");
        }
        if (quiz.endDate && now > new Date(quiz.endDate)) {
            throw new Error("This test has already ended.");
        }
    }
    // Check if there is an attempt
    const existingAttempt = await prisma_1.default.attempt.findFirst({
        where: {
            userId,
            quizId,
        },
    });
    if (existingAttempt) {
        if (!existingAttempt.completed) {
            if (!quiz.resumeAllowed) {
                throw new Error("Resume not allowed. This test cannot be continued.");
            }
            return { message: "Resuming attempt", attemptId: existingAttempt.id };
        }
    }
    // Create an in-progress attempt
    const attempt = await prisma_1.default.attempt.create({
        data: {
            userId,
            quizId,
            score: 0,
            percentage: 0,
            completed: false,
        },
    });
    return { message: "Attempt started successfully", attemptId: attempt.id };
};
exports.startQuizAttempt = startQuizAttempt;
