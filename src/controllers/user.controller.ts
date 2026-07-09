import { Request, Response } from "express";
import {
  getCandidatesList,
  getCandidateProfileDetails,
  getCandidateAttemptsHistory,
  updateCandidateDetails,
} from "../services/user.service";
import prisma from "../utils/prisma";
import { logAuditAction } from "../utils/auditLogger";
import { getCandidateAnalytics } from "../services/analytics.service";

/**
 * Controller to fetch list of candidates with search, filter, and sorting.
 */
export const listCandidates = async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string) || "";
    const filter = (req.query.filter as string) || "";
    const sortBy = (req.query.sortBy as string) || "name";

    const candidates = await getCandidatesList(search, filter, sortBy);
    res.json(candidates);
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Failed to retrieve candidates list",
    });
  }
};

/**
 * Controller to fetch detailed candidate profile stats.
 */
export const candidateProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profile = await getCandidateProfileDetails(id as string);
    res.json(profile);
  } catch (error: any) {
    res.status(404).json({
      message: error.message || "Candidate profile not found",
    });
  }
};

/**
 * Controller to fetch detailed candidate attempt history.
 */
export const candidateAttempts = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const history = await getCandidateAttemptsHistory(id as string);
    res.json(history);
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Failed to retrieve candidate attempts history",
    });
  }
};

/**
 * Controller to update candidate information or status.
 */
export const editCandidate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, mobileNumber, isActive, profilePhoto, password } = req.body;

    const current = await prisma.user.findUnique({
      where: { id: id as string },
    });

    const updated = await updateCandidateDetails(id as string, {
      name,
      email,
      mobileNumber,
      isActive,
      profilePhoto,
      password,
    });

    if (isActive !== undefined && current && current.isActive !== isActive) {
      const action = isActive ? "Candidate Activated" : "Candidate Deactivated";
      await logAuditAction(req, action, id as string);
    } else {
      await logAuditAction(req, "Candidate Profile Updated", id as string);
    }

    res.json({
      message: "Candidate updated successfully",
      candidate: updated,
    });
  } catch (error: any) {
    res.status(400).json({
      message: error.message || "Failed to update candidate details",
    });
  }
};

export const exportUserReportCSV = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;
    const user = await prisma.user.findUnique({
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

    await logAuditAction(req, "Candidate Report Exported (CSV)", userId);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=candidate_report_${userId}_${Date.now()}.csv`);
    res.send(csvRows.join("\n"));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const exportUserReportExcel = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;
    const user = await prisma.user.findUnique({
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

    await logAuditAction(req, "Candidate Report Exported (Excel)", userId);

    res.setHeader("Content-Type", "application/vnd.ms-excel");
    res.setHeader("Content-Disposition", `attachment; filename=candidate_report_${userId}_${Date.now()}.xls`);
    res.send(html);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Controller to fetch candidate analytics.
 */
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const range = (req.query.range as string) || "30d";

    const data = await getCandidateAnalytics(userId, range);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Failed to compute candidate performance analytics",
    });
  }
};

/**
 * Controller to update candidate goals.
 */
export const updateGoals = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { targetAccuracy, weeklyPracticeGoal, monthlyTestGoal, questionsPerWeekGoal, isEnabled } = req.body;

    const updated = await prisma.userGoal.upsert({
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

    await logAuditAction(req, "Candidate Goals Updated", userId);

    res.json({
      message: "Goals updated successfully",
      goal: updated,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Failed to save goals",
    });
  }
};
