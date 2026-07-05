"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getViolationStats = exports.getViolations = exports.recordViolation = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const recordViolation = async (req, res) => {
    try {
        const attemptId = req.params.attemptId;
        const { type, severity, screenshot, details } = req.body;
        if (!type)
            return res.status(400).json({ message: "type is required" });
        const violation = await prisma_1.default.proctoringViolation.create({
            data: {
                attemptId,
                type: type,
                severity: severity ?? client_1.ViolationSeverity.MEDIUM,
                screenshot: screenshot ?? null,
                details: details ?? null,
            },
        });
        // Fetch attempt with quiz proctoring config
        const attempt = await prisma_1.default.attempt.findUnique({
            where: { id: attemptId },
            include: { quiz: true },
        });
        const quiz = attempt?.quiz;
        const totalViolations = await prisma_1.default.proctoringViolation.count({ where: { attemptId } });
        const warningLimit = quiz?.proctorWarningLimit ?? 5;
        const autoSubmit = quiz?.proctorAutoSubmit ?? false;
        const action = quiz?.proctorViolationAction ?? "WARN";
        const shouldAutoSubmit = autoSubmit && totalViolations >= warningLimit;
        res.json({ violation, totalViolations, warningLimit, action, shouldAutoSubmit });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.recordViolation = recordViolation;
const getViolations = async (req, res) => {
    try {
        const attemptId = req.params.attemptId;
        const violations = await prisma_1.default.proctoringViolation.findMany({
            where: { attemptId },
            orderBy: { timestamp: "desc" },
        });
        res.json(violations);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.getViolations = getViolations;
const getViolationStats = async (req, res) => {
    try {
        const attemptId = req.params.attemptId;
        const violations = await prisma_1.default.proctoringViolation.findMany({ where: { attemptId } });
        const stats = violations.reduce((acc, v) => {
            acc[v.type] = (acc[v.type] || 0) + 1;
            return acc;
        }, {});
        res.json({ total: violations.length, byType: stats });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.getViolationStats = getViolationStats;
