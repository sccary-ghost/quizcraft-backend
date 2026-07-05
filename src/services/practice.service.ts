import prisma from "../utils/prisma";
import { PracticeSource, Difficulty } from "@prisma/client";

interface PracticeFilters {
  quizId?: string;
  subject?: string;
  chapter?: string;
  topic?: string;
  difficulty?: Difficulty;
  startDate?: string;
  endDate?: string;
  minAttempts?: number;
  maxAttempts?: number;
  minAccuracy?: number;
  maxAccuracy?: number;
  limit?: number;
}

interface AdaptiveSettings {
  neverCorrect?: boolean;
  incorrectLastAttempt?: boolean;
  incorrectMultiple?: boolean;
  frequentlySkipped?: boolean;
  weakDifficultyOnly?: boolean;
}

// 1. Generate Practice Session
export const generatePracticeSession = async (
  userId: string,
  source: PracticeSource,
  filters: PracticeFilters = {},
  adaptive: AdaptiveSettings = {},
  options: any = {}
) => {
  const limit = filters.limit || 20;
  let candidateQuestionIds: string[];

  // Step A: Aggregate candidates based on Source
  if (source === PracticeSource.BOOKMARKS) {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      select: { questionId: true },
    });
    candidateQuestionIds = bookmarks.map((b) => b.questionId);
  } else if (source === PracticeSource.INCORRECT) {
    const incorrectAnswers = await prisma.answer.findMany({
      where: {
        attempt: { userId },
        isCorrect: false,
        selectedAnswer: { not: null },
      },
      select: { questionId: true },
    });
    candidateQuestionIds = Array.from(new Set(incorrectAnswers.map((a) => a.questionId)));
  } else if (source === PracticeSource.SKIPPED) {
    const skippedAnswers = await prisma.answer.findMany({
      where: {
        attempt: { userId },
        selectedAnswer: null,
      },
      select: { questionId: true },
    });
    candidateQuestionIds = Array.from(new Set(skippedAnswers.map((a) => a.questionId)));
  } else if (
    source === PracticeSource.WEAK_SUBJECTS ||
    source === PracticeSource.WEAK_CHAPTERS ||
    source === PracticeSource.WEAK_TOPICS
  ) {
    // Determine weak areas (accuracy < 70%)
    const allAnswers = await prisma.answer.findMany({
      where: { attempt: { userId } },
      include: { question: true },
    });

    const groupStats: Record<string, { total: number; correct: number }> = {};
    allAnswers.forEach((ans) => {
      let key: string;
      if (source === PracticeSource.WEAK_SUBJECTS) key = ans.question.subject || "General";
      else if (source === PracticeSource.WEAK_CHAPTERS) key = ans.question.chapter || "Uncategorized";
      else key = ans.question.topic || "Miscellaneous";

      if (!groupStats[key]) groupStats[key] = { total: 0, correct: 0 };
      groupStats[key].total++;
      if (ans.isCorrect) groupStats[key].correct++;
    });

    const weakKeys = Object.keys(groupStats).filter((key) => {
      const accuracy = (groupStats[key].correct / groupStats[key].total) * 100;
      return accuracy < 70.0;
    });

    // Fetch questions from bank belonging to weak entities
    const weakQuestions = await prisma.question.findMany({
      where: {
        isBank: true,
        isDeleted: false,
        OR: [
          source === PracticeSource.WEAK_SUBJECTS ? { subject: { in: weakKeys } } : {},
          source === PracticeSource.WEAK_CHAPTERS ? { chapter: { in: weakKeys } } : {},
          source === PracticeSource.WEAK_TOPICS ? { topic: { in: weakKeys } } : {},
        ],
      },
      select: { id: true },
    });
    candidateQuestionIds = weakQuestions.map((q) => q.id);
  } else if (source === PracticeSource.MIXED) {
    // Combine bookmarks, incorrects, skipped
    const [bookmarks, incorrects, skipped] = await Promise.all([
      prisma.bookmark.findMany({ where: { userId }, select: { questionId: true } }),
      prisma.answer.findMany({ where: { attempt: { userId }, isCorrect: false }, select: { questionId: true } }),
      prisma.answer.findMany({ where: { attempt: { userId }, selectedAnswer: null }, select: { questionId: true } }),
    ]);

    const combined = new Set<string>();
    bookmarks.forEach((b) => combined.add(b.questionId));
    incorrects.forEach((a) => combined.add(a.questionId));
    skipped.forEach((a) => combined.add(a.questionId));
    candidateQuestionIds = Array.from(combined);
  } else {
    // CUSTOM/General Bank Questions
    const questions = await prisma.question.findMany({
      where: { isBank: true, isDeleted: false },
      select: { id: true },
    });
    candidateQuestionIds = questions.map((q) => q.id);
  }

  // Step B: Load candidate questions database details with basic filters
  const whereFilters: any = {
    id: { in: candidateQuestionIds },
    isDeleted: false,
  };

  if (filters.subject) whereFilters.subject = filters.subject;
  if (filters.chapter) whereFilters.chapter = filters.chapter;
  if (filters.topic) whereFilters.topic = filters.topic;
  if (filters.quizId) whereFilters.quizId = filters.quizId;

  const initialQuestions = await prisma.question.findMany({
    where: whereFilters,
  });

  // Step C: Apply Adaptive filtering based on student histories
  const allHistoricalAnswers = await prisma.answer.findMany({
    where: {
      attempt: { userId },
      questionId: { in: initialQuestions.map((q) => q.id) },
    },
    orderBy: { attempt: { submittedAt: "asc" } },
  });

  // Map histories per question
  const questionHistoryMap: Record<
    string,
    { total: number; correct: number; incorrect: number; skipped: number; lastIsCorrect: boolean | null }
  > = {};

  allHistoricalAnswers.forEach((ans) => {
    if (!questionHistoryMap[ans.questionId]) {
      questionHistoryMap[ans.questionId] = {
        total: 0,
        correct: 0,
        incorrect: 0,
        skipped: 0,
        lastIsCorrect: null,
      };
    }
    const qh = questionHistoryMap[ans.questionId];
    qh.total++;
    if (ans.selectedAnswer === null) {
      qh.skipped++;
      qh.lastIsCorrect = null;
    } else if (ans.isCorrect) {
      qh.correct++;
      qh.lastIsCorrect = true;
    } else {
      qh.incorrect++;
      qh.lastIsCorrect = false;
    }
  });

  const filtered = initialQuestions.filter((q) => {
    const qh = questionHistoryMap[q.id];
    
    // Adaptive checks
    if (adaptive.neverCorrect) {
      if (!qh || qh.correct > 0) return false;
    }
    if (adaptive.incorrectLastAttempt) {
      if (!qh || qh.lastIsCorrect !== false) return false;
    }
    if (adaptive.incorrectMultiple) {
      if (!qh || qh.incorrect <= 1) return false;
    }
    if (adaptive.frequentlySkipped) {
      if (!qh || qh.skipped <= 1) return false;
    }
    return true;
  });

  // Step D: Adaptive Difficulty expansion if remaining questions count is below target threshold
  const targetDiff = filters.difficulty || Difficulty.MEDIUM;
  let finalQuestions = filtered.filter((q) => q.difficulty === targetDiff);

  if (finalQuestions.length < limit) {
    // Fallback order: If Target is HARD -> include MEDIUM -> include EASY
    // If Target is MEDIUM -> include HARD -> include EASY
    // If Target is EASY -> include MEDIUM -> include HARD
    const fallbacks: Difficulty[] =
      targetDiff === Difficulty.HARD
        ? [Difficulty.MEDIUM, Difficulty.EASY]
        : targetDiff === Difficulty.MEDIUM
        ? [Difficulty.HARD, Difficulty.EASY]
        : [Difficulty.MEDIUM, Difficulty.HARD];

    for (const fb of fallbacks) {
      if (finalQuestions.length >= limit) break;
      const additional = filtered.filter((q) => q.difficulty === fb);
      finalQuestions = [...finalQuestions, ...additional].slice(0, limit);
    }
  }

  // Shuffle questions if requested
  if (options.shuffleQuestions) {
    finalQuestions = finalQuestions.sort(() => Math.random() - 0.5);
  }

  // Limit questions to target size
  finalQuestions = finalQuestions.slice(0, limit);

  // Step E: Persist PracticeSession and PracticeSessionQuestions
  const session = await prisma.practiceSession.create({
    data: {
      userId,
      source,
      filters: filters as any,
      adaptive: adaptive as any,
      options: options as any,
      totalQuestions: finalQuestions.length,
      startedAt: new Date(),
    },
  });

  // Create links
  const questionRelations = finalQuestions.map((q, idx) => ({
    practiceSessionId: session.id,
    questionId: q.id,
    order: idx,
  }));

  await prisma.practiceSessionQuestion.createMany({
    data: questionRelations,
  });

  const sessionWithQuestions = await prisma.practiceSession.findUnique({
    where: { id: session.id },
    include: {
      questions: {
        include: { question: true },
        orderBy: { order: "asc" },
      },
    },
  });

  return sessionWithQuestions;
};

// 2. Calculate Practice Center Stats for user
export const getPracticeStats = async (userId: string) => {
  const sessions = await prisma.practiceSession.findMany({
    where: { userId, completedAt: { not: null } },
    include: { questions: true },
    orderBy: { completedAt: "desc" },
  });

  const sourcesList = [
    PracticeSource.BOOKMARKS,
    PracticeSource.INCORRECT,
    PracticeSource.SKIPPED,
    PracticeSource.WEAK_SUBJECTS,
    PracticeSource.MIXED,
  ];

  const stats: Record<string, any> = {};

  for (const src of sourcesList) {
    const srcSessions = sessions.filter((s) => s.source === src);
    const total = srcSessions.length;

    if (total === 0) {
      stats[src] = {
        totalSessions: 0,
        avgAccuracy: 0,
        avgTime: 0,
        improvement: 0,
      };
      continue;
    }

    const avgAccuracy = srcSessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / total;
    const avgTime = srcSessions.reduce((sum, s) => sum + s.timeSpent, 0) / total;

    // Improvement since last session
    let improvement = 0;
    if (total > 1) {
      const lastSessionAccuracy = srcSessions[0].accuracy || 0;
      const previousSessions = srcSessions.slice(1);
      const prevAverage = previousSessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / previousSessions.length;
      improvement = lastSessionAccuracy - prevAverage;
    }

    stats[src] = {
      totalSessions: total,
      avgAccuracy: Math.round(avgAccuracy),
      avgTime: Math.round(avgTime),
      improvement: Math.round(improvement),
    };
  }

  return stats;
};

// 3. Recommended workout generator
export const getRecommendations = async (userId: string) => {
  // A. Check for due bookmarks
  const dueBookmarks = await prisma.bookmark.count({
    where: {
      userId,
      nextRevisionDate: { lte: new Date() },
    },
  });

  if (dueBookmarks > 0) {
    return {
      reason: `You have ${dueBookmarks} bookmarked questions due for spaced revision.`,
      source: PracticeSource.BOOKMARKS,
      filters: { limit: 15 },
      adaptive: {},
    };
  }

  // B. Analyze weak subject
  const allAnswers = await prisma.answer.findMany({
    where: { attempt: { userId } },
    include: { question: true },
  });

  const subjectStats: Record<string, { total: number; correct: number }> = {};
  allAnswers.forEach((ans) => {
    const sub = ans.question.subject || "General";
    if (!subjectStats[sub]) subjectStats[sub] = { total: 0, correct: 0 };
    subjectStats[sub].total++;
    if (ans.isCorrect) subjectStats[sub].correct++;
  });

  let weakestSubject = "";
  let lowestAccuracy = 100;

  Object.keys(subjectStats).forEach((sub) => {
    const accuracy = (subjectStats[sub].correct / subjectStats[sub].total) * 100;
    if (accuracy < lowestAccuracy && subjectStats[sub].total >= 5) {
      lowestAccuracy = accuracy;
      weakestSubject = sub;
    }
  });

  if (weakestSubject && lowestAccuracy < 70) {
    return {
      reason: `Your accuracy in "${weakestSubject}" is currently ${Math.round(lowestAccuracy)}%. Target practice recommended.`,
      source: PracticeSource.WEAK_SUBJECTS,
      filters: { subject: weakestSubject, limit: 15 },
      adaptive: {},
    };
  }

  // C. Fallback to general incorrect
  const incorrectCount = await prisma.answer.count({
    where: { attempt: { userId }, isCorrect: false },
  });

  if (incorrectCount > 0) {
    return {
      reason: `Review your ${incorrectCount} historical test mistakes to secure memory retention.`,
      source: PracticeSource.INCORRECT,
      filters: { limit: 20 },
      adaptive: { incorrectLastAttempt: true },
    };
  }

  // D. General mixed workout fallback
  return {
    reason: "A balanced mixed revision session is recommended to maintain baseline accuracy scores.",
    source: PracticeSource.MIXED,
    filters: { limit: 20 },
    adaptive: {},
  };
};
