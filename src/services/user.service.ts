import bcrypt from "bcrypt";
import prisma from "../utils/prisma";

/**
 * Get all candidates with optional search, active/inactive filtering, and sorting options.
 */
export const getCandidatesList = async (
  search: string = "",
  statusFilter: string = "",
  sortBy: string = "name"
) => {
  const searchLower = search.trim().toLowerCase();
  const where: any = {};

  if (searchLower) {
    where.OR = [
      { name: { contains: searchLower, mode: "insensitive" } },
      { email: { contains: searchLower, mode: "insensitive" } },
      { mobileNumber: { contains: searchLower, mode: "insensitive" } },
    ];
  }

  if (statusFilter === "active") {
    where.isActive = true;
  } else if (statusFilter === "inactive") {
    where.isActive = false;
  }

  // Fetch users with attempt counts
  const users = await prisma.user.findMany({
    where,
    include: {
      _count: {
        select: { attempts: true },
      },
    },
  });

  const candidates = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    mobileNumber: user.mobileNumber || "—",
    isActive: user.isActive,
    profilePhoto: user.profilePhoto,
    createdAt: user.createdAt,
    attemptsCount: user._count.attempts,
  }));

  // Perform sorting
  if (sortBy === "createdAt") {
    candidates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (sortBy === "testsAttempted") {
    candidates.sort((a, b) => b.attemptsCount - a.attemptsCount);
  } else {
    // Sort alphabetically by name
    candidates.sort((a, b) => a.name.localeCompare(b.name));
  }

  return candidates;
};

/**
 * Get profile metrics for a specific candidate.
 */
export const getCandidateProfileDetails = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("Candidate not found");
  }

  // Get completed attempts
  const completedAttempts = await prisma.attempt.findMany({
    where: { userId, completed: true },
    include: {
      answers: true,
    },
  });

  // Count ongoing attempts
  const ongoingCount = await prisma.attempt.count({
    where: { userId, completed: false },
  });

  const totalTests = await prisma.attempt.count({
    where: { userId },
  });

  const completedCount = completedAttempts.length;

  // Average score and percentage
  const avgScore = completedCount > 0
    ? completedAttempts.reduce((sum, att) => sum + att.score, 0) / completedCount
    : 0;

  const avgPercentage = completedCount > 0
    ? completedAttempts.reduce((sum, att) => sum + att.percentage, 0) / completedCount
    : 0;

  // Accuracy calculation (correct answers / total questions in attempt)
  const totalCorrectAnswers = completedAttempts.reduce(
    (sum, att) => sum + att.answers.filter((ans) => ans.isCorrect).length,
    0
  );
  const totalQuestionsAnswered = completedAttempts.reduce(
    (sum, att) => sum + att.answers.length,
    0
  );
  const overallAccuracy = totalQuestionsAnswered > 0
    ? (totalCorrectAnswers / totalQuestionsAnswered) * 100
    : 0;

  // Time metrics
  const totalTimeSpent = completedAttempts.reduce(
    (sum, att) => sum + att.answers.reduce((s, ans) => s + ans.timeSpent, 0),
    0
  );
  const avgTimePerTest = completedCount > 0
    ? totalTimeSpent / completedCount
    : 0;

  return {
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobileNumber: user.mobileNumber || "—",
      registrationDate: user.createdAt,
      isActive: user.isActive,
      profilePhoto: user.profilePhoto,
    },
    stats: {
      totalTests,
      completedTests: completedCount,
      ongoingTests: ongoingCount,
      averageScore: avgScore,
      averagePercentage: avgPercentage,
      overallAccuracy,
      averageTimePerTest: avgTimePerTest,
    },
  };
};

/**
 * Get all attempts history for a candidate.
 */
export const getCandidateAttemptsHistory = async (userId: string) => {
  const attempts = await prisma.attempt.findMany({
    where: { userId },
    include: {
      quiz: true,
      answers: true,
    },
    orderBy: { submittedAt: "desc" },
  });

  return attempts.map((attempt) => {
    const correctCount = attempt.answers.filter((ans) => ans.isCorrect).length;
    const totalCount = attempt.answers.length;
    const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
    const timeTaken = attempt.answers.reduce((sum, ans) => sum + ans.timeSpent, 0);

    return {
      id: attempt.id,
      testName: attempt.quiz.title,
      attemptDate: attempt.submittedAt,
      status: attempt.completed ? "Completed" : "In Progress",
      score: attempt.score,
      percentage: attempt.percentage,
      accuracy,
      timeTaken,
      resultLink: `/analysis/${attempt.id}`,
    };
  });
};

/**
 * Edit candidate basic details and active status.
 */
export const updateCandidateDetails = async (
  userId: string,
  data: {
    name?: string;
    email?: string;
    mobileNumber?: string;
    isActive?: boolean;
    profilePhoto?: string;
    password?: string;
  }
) => {
  // Check for uniqueness if email is changed
  if (data.email) {
    const existingEmail = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id: userId } },
    });
    if (existingEmail) {
      throw new Error("Email address already registered by another candidate");
    }
  }

  // Check for uniqueness if mobile is changed
  if (data.mobileNumber) {
    const existingMobile = await prisma.user.findFirst({
      where: { mobileNumber: data.mobileNumber, NOT: { id: userId } },
    });
    if (existingMobile) {
      throw new Error("Mobile number already registered by another candidate");
    }
  }

  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    mobileNumber: user.mobileNumber,
    isActive: user.isActive,
    profilePhoto: user.profilePhoto,
  };
};
