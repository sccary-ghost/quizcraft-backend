"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGoals = exports.getAnalytics = exports.exportUserReportExcel = exports.exportUserReportCSV = exports.editCandidate = exports.candidateAttempts = exports.candidateProfile = exports.listCandidates = void 0;
const user_service_1 = require("../services/user.service");
const prisma_1 = __importDefault(require("../utils/prisma"));
const auditLogger_1 = require("../utils/auditLogger");
const analytics_service_1 = require("../services/analytics.service");
/**
 * Controller to fetch list of candidates with search, filter, and sorting.
 */
const listCandidates = async (req, res) => {
    try {
        const search = req.query.search || "";
        const filter = req.query.filter || "";
        const sortBy = req.query.sortBy || "name";
        const candidates = await (0, user_service_1.getCandidatesList)(search, filter, sortBy);
        res.json(candidates);
    }
    catch (error) {
        res.status(500).json({
            message: error.message || "Failed to retrieve candidates list",
        });
    }
};
exports.listCandidates = listCandidates;
/**
 * Controller to fetch detailed candidate profile stats.
 */
const candidateProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const profile = await (0, user_service_1.getCandidateProfileDetails)(id);
        res.json(profile);
    }
    catch (error) {
        res.status(404).json({
            message: error.message || "Candidate profile not found",
        });
    }
};
exports.candidateProfile = candidateProfile;
/**
 * Controller to fetch detailed candidate attempt history.
 */
const candidateAttempts = async (req, res) => {
    try {
        const { id } = req.params;
        const history = await (0, user_service_1.getCandidateAttemptsHistory)(id);
        res.json(history);
    }
    catch (error) {
        res.status(500).json({
            message: error.message || "Failed to retrieve candidate attempts history",
        });
    }
};
exports.candidateAttempts = candidateAttempts;
/**
 * Controller to update candidate information or status.
 */
const editCandidate = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, mobileNumber, isActive, profilePhoto } = req.body;
        const current = await prisma_1.default.user.findUnique({
            where: { id: id },
        });
        const updated = await (0, user_service_1.updateCandidateDetails)(id, {
            name,
            email,
            mobileNumber,
            isActive,
            profilePhoto,
        });
        if (isActive !== undefined && current && current.isActive !== isActive) {
            const action = isActive ? "Candidate Activated" : "Candidate Deactivated";
            await (0, auditLogger_1.logAuditAction)(req, action, id);
        }
        else {
            await (0, auditLogger_1.logAuditAction)(req, "Candidate Profile Updated", id);
        }
        res.json({
            message: "Candidate updated successfully",
            candidate: updated,
        });
    }
    catch (error) {
        res.status(400).json({
            message: error.message || "Failed to update candidate details",
        });
    }
};
exports.editCandidate = editCandidate;
const exportUserReportCSV = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            include: {
                attempts: {
                    include: {
                        quiz: true,
                    },
                    orderBy: { submittedAt: "desc" },
                },
            },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const fullName = user.name || "N/A";
        const emailStr = user.email || "N/A";
        const mobileStr = user.mobileNumber || "N/A";
        const csvRows = [];
        csvRows.push(`"Candidate Performance Report"`);
        csvRows.push(`"Full Name","${fullName.replace(/"/g, '""')}"`);
        csvRows.push(`"Email","${emailStr.replace(/"/g, '""')}"`);
        csvRows.push(`"Mobile Number","${mobileStr.replace(/"/g, '""')}"`);
        csvRows.push(`"Registration Date","${new Date(user.createdAt).toLocaleDateString()}"`);
        csvRows.push(`"Account Status","${user.isActive ? "Active" : "Inactive"}"`);
        csvRows.push(`"Exported At","${new Date().toLocaleString()}"`);
        csvRows.push("");
        csvRows.push(`"Test Paper","Score","Percentage (%)","Submitted At","Status"`);
        for (const att of user.attempts) {
            const quizTitle = att.quiz?.title || "N/A";
            const score = att.score;
            const percentage = att.percentage.toFixed(2);
            const date = att.submittedAt ? new Date(att.submittedAt).toLocaleString() : "In Progress";
            const status = att.completed ? "Completed" : "Ongoing";
            csvRows.push(`"${quizTitle.replace(/"/g, '""')}",${score},${percentage},"${date}","${status}"`);
        }
        await (0, auditLogger_1.logAuditAction)(req, "Candidate Report Exported (CSV)", userId);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=candidate_report_${userId}_${Date.now()}.csv`);
        res.send(csvRows.join("\n"));
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.exportUserReportCSV = exportUserReportCSV;
const exportUserReportExcel = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            include: {
                attempts: {
                    include: {
                        quiz: true,
                    },
                    orderBy: { submittedAt: "desc" },
                },
            },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          table { border-collapse: collapse; }
          th { background-color: #f1f5f9; font-weight: bold; border: 1px solid #cbd5e1; }
          td { border: 1px solid #cbd5e1; padding: 6px; }
        </style>
      </head>
      <body>
        <h2>Candidate Performance Report</h2>
        <p><strong>Full Name:</strong> ${user.name || "N/A"}</p>
        <p><strong>Email:</strong> ${user.email || "N/A"}</p>
        <p><strong>Mobile Number:</strong> ${user.mobileNumber || "N/A"}</p>
        <p><strong>Registration Date:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
        <p><strong>Account Status:</strong> ${user.isActive ? "Active" : "Inactive"}</p>
        <p><strong>Exported At:</strong> ${new Date().toLocaleString()}</p>
        <br/>
        <table>
          <thead>
            <tr>
              <th>Test Paper</th>
              <th>Score</th>
              <th>Percentage (%)</th>
              <th>Submitted At</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
    `;
        for (const att of user.attempts) {
            const quizTitle = att.quiz?.title || "N/A";
            const score = att.score;
            const percentage = att.percentage.toFixed(2);
            const date = att.submittedAt ? new Date(att.submittedAt).toLocaleString() : "In Progress";
            const status = att.completed ? "Completed" : "Ongoing";
            html += `
        <tr>
          <td>${quizTitle}</td>
          <td>${score}</td>
          <td>${percentage}</td>
          <td>${date}</td>
          <td>${status}</td>
        </tr>
      `;
        }
        html += `
          </tbody>
        </table>
      </body>
      </html>
    `;
        await (0, auditLogger_1.logAuditAction)(req, "Candidate Report Exported (Excel)", userId);
        res.setHeader("Content-Type", "application/vnd.ms-excel");
        res.setHeader("Content-Disposition", `attachment; filename=candidate_report_${userId}_${Date.now()}.xls`);
        res.send(html);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.exportUserReportExcel = exportUserReportExcel;
/**
 * Controller to fetch candidate analytics.
 */
const getAnalytics = async (req, res) => {
    try {
        const userId = req.user.userId;
        const range = req.query.range || "30d";
        const data = await (0, analytics_service_1.getCandidateAnalytics)(userId, range);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({
            message: error.message || "Failed to compute candidate performance analytics",
        });
    }
};
exports.getAnalytics = getAnalytics;
/**
 * Controller to update candidate goals.
 */
const updateGoals = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { targetAccuracy, weeklyPracticeGoal, monthlyTestGoal, questionsPerWeekGoal, isEnabled } = req.body;
        const updated = await prisma_1.default.userGoal.upsert({
            where: { userId },
            update: {
                ...(targetAccuracy !== undefined ? { targetAccuracy: parseFloat(targetAccuracy) } : {}),
                ...(weeklyPracticeGoal !== undefined ? { weeklyPracticeGoal: parseInt(weeklyPracticeGoal) } : {}),
                ...(monthlyTestGoal !== undefined ? { monthlyTestGoal: parseInt(monthlyTestGoal) } : {}),
                ...(questionsPerWeekGoal !== undefined ? { questionsPerWeekGoal: parseInt(questionsPerWeekGoal) } : {}),
                ...(isEnabled !== undefined ? { isEnabled: Boolean(isEnabled) } : {}),
            },
            create: {
                userId,
                targetAccuracy: targetAccuracy !== undefined ? parseFloat(targetAccuracy) : 75.0,
                weeklyPracticeGoal: weeklyPracticeGoal !== undefined ? parseInt(weeklyPracticeGoal) : 5,
                monthlyTestGoal: monthlyTestGoal !== undefined ? parseInt(monthlyTestGoal) : 15,
                questionsPerWeekGoal: questionsPerWeekGoal !== undefined ? parseInt(questionsPerWeekGoal) : 100,
                isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : true,
            },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Candidate Goals Updated", userId);
        res.json({
            message: "Goals updated successfully",
            goal: updated,
        });
    }
    catch (error) {
        res.status(500).json({
            message: error.message || "Failed to save goals",
        });
    }
};
exports.updateGoals = updateGoals;
