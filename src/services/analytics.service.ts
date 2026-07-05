import prisma from "../utils/prisma";

export interface AnalyticsResult {
  overall: {
    accuracy: number;
    percentile: number;
    avgScore: number;
    highestScore: number;
    lowestScore: number;
    testsAttempted: number;
    testsCompleted: number;
    totalTimeSpent: number;
    avgTimePerQuestion: number;
    last10Avg: number;
    prev10Avg: number;
    improvement: number;
    totalQuestions: number;
    correctQuestions: number;
    incorrectQuestions: number;
    skippedQuestions: number;
  };
  streaks: {
    currentDaily: number;
    longestDaily: number;
    weekly: number;
  };
  difficulty: {
    easyAccuracy: number;
    mediumAccuracy: number;
    hardAccuracy: number;
  };
  rankings: {
    topSubjects: { name: string; accuracy: number; total: number }[];
    bottomSubjects: { name: string; accuracy: number; total: number }[];
    topChapters: { name: string; accuracy: number; total: number }[];
    bottomChapters: { name: string; accuracy: number; total: number }[];
    topTopics: { name: string; accuracy: number; total: number }[];
    bottomTopics: { name: string; accuracy: number; total: number }[];
  };
  goals: {
    isEnabled: boolean;
    targetAccuracy: number;
    weeklyPracticeGoal: number;
    monthlyTestGoal: number;
    questionsPerWeekGoal: number;
    accuracyProgress: number;
    weeklyTestsCompleted: number;
    weeklyTestsProgress: number;
    monthlyTestsCompleted: number;
    monthlyTestsProgress: number;
    weeklyQuestionsCompleted: number;
    weeklyQuestionsProgress: number;
  };
  insights: {
    highestAccuracySubject: string | null;
    lowestAccuracySubject: string | null;
    fastestSubject: string | null;
    slowestSubject: string | null;
    mostImprovedSubject: string | null;
    highestSkipRateSubject: string | null;
    highestIncorrectRateSubject: string | null;
    mostPracticedSubject: string | null;
    leastPracticedSubject: string | null;
    statements: string[];
  };
  achievements: {
    firstTestCompleted: boolean;
    streak7Day: boolean;
    accuracy90Percent: boolean;
    questions1000: boolean;
    tests100: boolean;
    top10Percentile: boolean;
  };
  trends: {
    scoreHistory: { testTitle: string; score: number; accuracy: number; date: string }[];
    weeklyActivity: { week: string; count: number }[];
    monthlyActivity: { month: string; count: number }[];
    timeHistory: { testTitle: string; avgTime: number; date: string }[];
  };
}

const getWeekNumber = (d: Date): number => {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime() + (start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1050; // offset adjustment
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / (oneDay * 7));
};

export const getCandidateAnalytics = async (
  userId: string,
  range: string
): Promise<AnalyticsResult> => {
  // ── Determine range start date ─────────────────────────────────────────────
  const dateFilter: any = {};
  if (range !== "all_time") {
    let days = 0;
    if (range === "7d") days = 7;
    else if (range === "30d") days = 30;
    else if (range === "90d") days = 90;

    if (days > 0) {
      dateFilter.gte = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    } else if (range === "this_year") {
      dateFilter.gte = new Date(new Date().getFullYear(), 0, 1);
    }
  }

  // 1. Fetch filtered attempts (with answers and questions)
  const attempts = await prisma.attempt.findMany({
    where: {
      userId,
      completed: true,
      ...(dateFilter.gte ? { submittedAt: dateFilter } : {}),
    },
    include: {
      answers: {
        include: {
          question: true,
        },
      },
      quiz: true,
    },
    orderBy: { submittedAt: "asc" },
  });

  // 2. Fetch all-time attempts to calculate streaks, totals, and goals correctly
  const allTimeAttempts = await prisma.attempt.findMany({
    where: { userId, completed: true },
    select: { submittedAt: true, score: true, percentage: true },
    orderBy: { submittedAt: "desc" },
  });

  // ── Overall Rank/Percentile ────────────────────────────────────────────────
  const allUserAverages = await prisma.attempt.groupBy({
    by: ["userId"],
    _avg: { percentage: true },
  });

  const myAvg =
    attempts.length > 0
      ? attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length
      : 0;

  const totalUsers = allUserAverages.length || 1;
  const countLower = allUserAverages.filter(
    (u) => (u._avg.percentage || 0) <= myAvg
  ).length;
  const percentile = (countLower / totalUsers) * 100;

  // ── Streaks ────────────────────────────────────────────────────────────────
  const uniqueDates = Array.from(
    new Set(
      allTimeAttempts.map((a) => a.submittedAt.toISOString().split("T")[0])
    )
  ).sort((a, b) => b.localeCompare(a)); // Descending order

  let currentDaily = 0;
  let longestDaily = 0;
  let weekly = 0;

  if (uniqueDates.length > 0) {
    const todayStr = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Compute Current daily streak
    let streakDate = uniqueDates[0] === todayStr ? todayStr : uniqueDates[0] === yesterdayStr ? yesterdayStr : null;
    
    if (streakDate) {
      currentDaily = 1;
      let checkDate = new Date(streakDate);
      for (let i = 1; i < uniqueDates.length; i++) {
        checkDate.setDate(checkDate.getDate() - 1);
        const expected = checkDate.toISOString().split("T")[0];
        if (uniqueDates.includes(expected)) {
          currentDaily++;
        } else {
          break;
        }
      }
    }

    // Compute Longest daily streak
    let currentRun = 0;
    let prevCheckDate: Date | null = null;
    
    // Sort ascending for forward run check
    const sortedAsc = [...uniqueDates].reverse();
    for (const dStr of sortedAsc) {
      const d = new Date(dStr);
      if (!prevCheckDate) {
        currentRun = 1;
      } else {
        const diffTime = Math.abs(d.getTime() - prevCheckDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentRun++;
        } else if (diffDays > 1) {
          currentRun = 1;
        }
      }
      prevCheckDate = d;
      if (currentRun > longestDaily) {
        longestDaily = currentRun;
      }
    }
    if (longestDaily === 0 && uniqueDates.length > 0) {
      longestDaily = 1;
    }

    const uniqueWeeks = Array.from(
      new Set(allTimeAttempts.map((a) => `${a.submittedAt.getFullYear()}-W${getWeekNumber(a.submittedAt)}`))
    );
    
    // Simplistic weekly streak: count unique weeks in current run
    weekly = uniqueWeeks.length;
  }

  // ── Metrics & Aggregations ─────────────────────────────────────────────────
  let totalQuestions = 0;
  let correctQuestions = 0;
  let incorrectQuestions = 0;
  let skippedQuestions = 0;
  let totalTimeSpent = 0;

  let highestScore = 0;
  let lowestScore = attempts.length > 0 ? 100 : 0;
  let totalScoreSum = 0;

  const subjectMap = new Map<string, { correct: number; incorrect: number; skipped: number; time: number }>();
  const chapterMap = new Map<string, { correct: number; incorrect: number; skipped: number; time: number }>();
  const topicMap = new Map<string, { correct: number; incorrect: number; skipped: number; time: number }>();

  let easyTotal = 0, easyCorrect = 0;
  let mediumTotal = 0, mediumCorrect = 0;
  let hardTotal = 0, hardCorrect = 0;

  for (const a of attempts) {
    totalScoreSum += a.percentage;
    if (a.percentage > highestScore) highestScore = a.percentage;
    if (a.percentage < lowestScore) lowestScore = a.percentage;

    for (const ans of a.answers) {
      totalQuestions++;
      totalTimeSpent += ans.timeSpent;

      const isSkipped = !ans.selectedAnswer;
      if (isSkipped) {
        skippedQuestions++;
      } else if (ans.isCorrect) {
        correctQuestions++;
      } else {
        incorrectQuestions++;
      }

      // Difficulty analysis (Questions Revision might save difficulty, fallback to Question)
      const diff = ans.question?.difficulty || "MEDIUM";
      if (diff === "EASY") {
        easyTotal++;
        if (ans.isCorrect) easyCorrect++;
      } else if (diff === "HARD") {
        hardTotal++;
        if (ans.isCorrect) hardCorrect++;
      } else {
        mediumTotal++;
        if (ans.isCorrect) mediumCorrect++;
      }

      // Subject, Chapter, Topic tags mapping
      const sub = ans.question?.subject || "Unassigned";
      const chap = ans.question?.chapter || "Unassigned";
      const top = ans.question?.topic || "Unassigned";

      const processMap = (map: Map<string, any>, key: string) => {
        if (!map.has(key)) {
          map.set(key, { correct: 0, incorrect: 0, skipped: 0, time: 0 });
        }
        const val = map.get(key)!;
        val.time += ans.timeSpent;
        if (isSkipped) val.skipped++;
        else if (ans.isCorrect) val.correct++;
        else val.incorrect++;
      };

      processMap(subjectMap, sub);
      processMap(chapterMap, chap);
      processMap(topicMap, top);
    }
  }

  const overallAccuracy = totalQuestions > 0 ? (correctQuestions / totalQuestions) * 100 : 0;
  const avgScore = attempts.length > 0 ? totalScoreSum / attempts.length : 0;
  const avgTimePerQuestion = totalQuestions > 0 ? totalTimeSpent / totalQuestions : 0;

  // Last 10 vs Previous 10 analysis (Chronological)
  let last10Avg = 0;
  let prev10Avg = 0;
  let improvement = 0;

  if (allTimeAttempts.length > 0) {
    const l10 = allTimeAttempts.slice(0, 10);
    last10Avg = l10.reduce((s, a) => s + a.percentage, 0) / l10.length;

    if (allTimeAttempts.length > 10) {
      const p10 = allTimeAttempts.slice(10, 20);
      prev10Avg = p10.reduce((s, a) => s + a.percentage, 0) / p10.length;
      if (prev10Avg > 0) {
        improvement = ((last10Avg - prev10Avg) / prev10Avg) * 100;
      }
    }
  }

  // ── Difficulty Accuracy ratios ─────────────────────────────────────────────
  const easyAccuracy = easyTotal > 0 ? (easyCorrect / easyTotal) * 100 : 0;
  const mediumAccuracy = mediumTotal > 0 ? (mediumCorrect / mediumTotal) * 100 : 0;
  const hardAccuracy = hardTotal > 0 ? (hardCorrect / hardTotal) * 100 : 0;

  // ── Top & Bottom Rankings calculation ──────────────────────────────────────
  const getRankedList = (map: Map<string, { correct: number; incorrect: number; skipped: number; time: number }>) => {
    return Array.from(map.entries()).map(([name, val]) => {
      const total = val.correct + val.incorrect + val.skipped;
      const accuracy = total > 0 ? (val.correct / total) * 100 : 0;
      return { name, accuracy, total };
    });
  };

  const rankedSubjects = getRankedList(subjectMap);
  const rankedChapters = getRankedList(chapterMap);
  const rankedTopics = getRankedList(topicMap);

  const topSubjects = [...rankedSubjects].sort((a, b) => b.accuracy - a.accuracy || b.total - a.total).slice(0, 5);
  const bottomSubjects = [...rankedSubjects].sort((a, b) => a.accuracy - b.accuracy || a.total - b.total).slice(0, 5);

  const topChapters = [...rankedChapters].sort((a, b) => b.accuracy - a.accuracy || b.total - a.total).slice(0, 5);
  const bottomChapters = [...rankedChapters].sort((a, b) => a.accuracy - b.accuracy || a.total - b.total).slice(0, 5);

  const topTopics = [...rankedTopics].sort((a, b) => b.accuracy - a.accuracy || b.total - a.total).slice(0, 5);
  const bottomTopics = [...rankedTopics].sort((a, b) => a.accuracy - b.accuracy || a.total - b.total).slice(0, 5);

  // ── User Goals Progress details ────────────────────────────────────────────
  let goal = await prisma.userGoal.findUnique({
    where: { userId },
  });

  if (!goal) {
    goal = await prisma.userGoal.create({
      data: { userId },
    });
  }

  // Count completions in goals scopes
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const weeklyTestsCompleted = await prisma.attempt.count({
    where: { userId, completed: true, submittedAt: { gte: sevenDaysAgo } },
  });

  const monthlyTestsCompleted = await prisma.attempt.count({
    where: { userId, completed: true, submittedAt: { gte: thirtyDaysAgo } },
  });

  const weeklyAnswers = await prisma.answer.count({
    where: {
      attempt: {
        userId,
        completed: true,
        submittedAt: { gte: sevenDaysAgo },
      },
    },
  });

  const accuracyProgress = goal.targetAccuracy > 0 ? (overallAccuracy / goal.targetAccuracy) * 100 : 0;
  const weeklyTestsProgress = goal.weeklyPracticeGoal > 0 ? (weeklyTestsCompleted / goal.weeklyPracticeGoal) * 100 : 0;
  const monthlyTestsProgress = goal.monthlyTestGoal > 0 ? (monthlyTestsCompleted / goal.monthlyTestGoal) * 100 : 0;
  const weeklyQuestionsProgress = goal.questionsPerWeekGoal > 0 ? (weeklyAnswers / goal.questionsPerWeekGoal) * 100 : 0;

  // ── Deterministic Insights engine ──────────────────────────────────────────
  let highestAccuracySubject: string | null = null;
  let lowestAccuracySubject: string | null = null;
  let fastestSubject: string | null = null;
  let slowestSubject: string | null = null;
  let mostImprovedSubject: string | null = null;
  let highestSkipRateSubject: string | null = null;
  let highestIncorrectRateSubject: string | null = null;
  let mostPracticedSubject: string | null = null;
  let leastPracticedSubject: string | null = null;
  const statements: string[] = [];

  if (rankedSubjects.length > 0) {
    // 1. Highest/Lowest accuracy subjects
    const sortedAcc = [...rankedSubjects].sort((a, b) => b.accuracy - a.accuracy);
    highestAccuracySubject = sortedAcc[0].name;
    lowestAccuracySubject = sortedAcc[sortedAcc.length - 1].name;

    statements.push(`${highestAccuracySubject} has your highest subject accuracy (${Math.round(sortedAcc[0].accuracy)}%).`);
    if (lowestAccuracySubject !== highestAccuracySubject) {
      statements.push(`${lowestAccuracySubject} is your lowest accuracy subject (${Math.round(sortedAcc[sortedAcc.length - 1].accuracy)}%), which needs focus.`);
    }

    // 2. Fastest/Slowest subject (based on avg time per question)
    const subjectAvgs = Array.from(subjectMap.entries()).map(([name, val]) => {
      const total = val.correct + val.incorrect + val.skipped;
      return { name, avgTime: total > 0 ? val.time / total : 99999 };
    });
    subjectAvgs.sort((a, b) => a.avgTime - b.avgTime);
    fastestSubject = subjectAvgs[0].name;
    slowestSubject = subjectAvgs[subjectAvgs.length - 1].name;

    statements.push(`You solve questions fastest in ${fastestSubject} (avg ${Math.round(subjectAvgs[0].avgTime)}s).`);
    if (slowestSubject !== fastestSubject) {
      statements.push(`${slowestSubject} is your slowest subject (avg ${Math.round(subjectAvgs[subjectAvgs.length - 1].avgTime)}s).`);
    }

    // 3. Skip rates & Incorrect rates
    const skipRates = Array.from(subjectMap.entries()).map(([name, val]) => {
      const total = val.correct + val.incorrect + val.skipped;
      return { name, rate: total > 0 ? (val.skipped / total) * 100 : 0 };
    });
    skipRates.sort((a, b) => b.rate - a.rate);
    highestSkipRateSubject = skipRates[0].rate > 0 ? skipRates[0].name : null;
    if (highestSkipRateSubject) {
      statements.push(`${highestSkipRateSubject} has your highest question skip rate (${Math.round(skipRates[0].rate)}%).`);
    }

    const incorrectRates = Array.from(subjectMap.entries()).map(([name, val]) => {
      const total = val.correct + val.incorrect + val.skipped;
      return { name, rate: total > 0 ? (val.incorrect / total) * 100 : 0 };
    });
    incorrectRates.sort((a, b) => b.rate - a.rate);
    highestIncorrectRateSubject = incorrectRates[0].rate > 0 ? incorrectRates[0].name : null;
    if (highestIncorrectRateSubject) {
      statements.push(`${highestIncorrectRateSubject} has your highest incorrect answers rate (${Math.round(incorrectRates[0].rate)}%).`);
    }

    // 4. Most / Least Practiced subjects
    const sortedPrac = [...rankedSubjects].sort((a, b) => b.total - a.total);
    mostPracticedSubject = sortedPrac[0].name;
    leastPracticedSubject = sortedPrac[sortedPrac.length - 1].name;
    statements.push(`You practiced ${mostPracticedSubject} the most (${sortedPrac[0].total} questions).`);

    // 5. Most Improved Subject (comparing first half vs second half attempts)
    if (attempts.length >= 4) {
      const halfIndex = Math.floor(attempts.length / 2);
      const firstHalf = attempts.slice(0, halfIndex);
      const secondHalf = attempts.slice(halfIndex);

      const getHalfAccuracy = (half: typeof attempts) => {
        const accMap = new Map<string, { correct: number; total: number }>();
        for (const at of half) {
          for (const ans of at.answers) {
            const subName = ans.question?.subject || "Unassigned";
            if (!accMap.has(subName)) accMap.set(subName, { correct: 0, total: 0 });
            const val = accMap.get(subName)!;
            val.total++;
            if (ans.isCorrect) val.correct++;
          }
        }
        return accMap;
      };

      const firstMap = getHalfAccuracy(firstHalf);
      const secondMap = getHalfAccuracy(secondHalf);

      let maxDiff = -100;
      let improvedSub: string | null = null;

      for (const [subName, secondVal] of secondMap.entries()) {
        const firstVal = firstMap.get(subName);
        if (firstVal && firstVal.total >= 5 && secondVal.total >= 5) {
          const firstAcc = (firstVal.correct / firstVal.total) * 100;
          const secondAcc = (secondVal.correct / secondVal.total) * 100;
          const diff = secondAcc - firstAcc;
          if (diff > maxDiff) {
            maxDiff = diff;
            improvedSub = subName;
          }
        }
      }

      if (improvedSub && maxDiff > 2) {
        mostImprovedSubject = improvedSub;
        statements.push(`Your ${improvedSub} accuracy improved by ${Math.round(maxDiff)}% comparing recent attempts.`);
      }
    }
  }

  // ── Achievement Badges ─────────────────────────────────────────────────────
  const achievements = {
    firstTestCompleted: allTimeAttempts.length >= 1,
    streak7Day: longestDaily >= 7,
    accuracy90Percent: overallAccuracy >= 90 && totalQuestions >= 20,
    questions1000: totalQuestions >= 1000,
    tests100: allTimeAttempts.length >= 100,
    top10Percentile: percentile >= 90 && allTimeAttempts.length >= 5,
  };

  // ── Trends Analysis ────────────────────────────────────────────────────────
  const scoreHistory = attempts.map((at) => ({
    testTitle: at.quiz?.title || "Test",
    score: at.score,
    accuracy: at.answers.length > 0 ? (at.answers.filter((x) => x.isCorrect).length / at.answers.length) * 100 : 0,
    date: at.submittedAt.toISOString().split("T")[0],
  }));

  const timeHistory = attempts.map((at) => {
    const totalQ = at.answers.length;
    const totalT = at.answers.reduce((s, x) => s + x.timeSpent, 0);
    return {
      testTitle: at.quiz?.title || "Test",
      avgTime: totalQ > 0 ? totalT / totalQ : 0,
      date: at.submittedAt.toISOString().split("T")[0],
    };
  });

  // Calculate Weekly activity
  const weeklyActivityMap = new Map<string, number>();
  for (const at of allTimeAttempts) {
    const d = at.submittedAt;
    const weekLabel = `Wk ${getWeekNumber(d)} (${d.getFullYear()})`;
    weeklyActivityMap.set(weekLabel, (weeklyActivityMap.get(weekLabel) || 0) + 1);
  }
  const weeklyActivity = Array.from(weeklyActivityMap.entries())
    .slice(0, 8)
    .reverse()
    .map(([week, count]) => ({ week, count }));

  // Calculate Monthly activity
  const monthlyActivityMap = new Map<string, number>();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (const at of allTimeAttempts) {
    const d = at.submittedAt;
    const monthLabel = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    monthlyActivityMap.set(monthLabel, (monthlyActivityMap.get(monthLabel) || 0) + 1);
  }
  const monthlyActivity = Array.from(monthlyActivityMap.entries())
    .slice(0, 6)
    .reverse()
    .map(([month, count]) => ({ month, count }));

  return {
    overall: {
      accuracy: overallAccuracy,
      percentile,
      avgScore,
      highestScore,
      lowestScore,
      testsAttempted: allTimeAttempts.length,
      testsCompleted: allTimeAttempts.length,
      totalTimeSpent,
      avgTimePerQuestion,
      last10Avg,
      prev10Avg,
      improvement,
      totalQuestions,
      correctQuestions,
      incorrectQuestions,
      skippedQuestions,
    },
    streaks: {
      currentDaily,
      longestDaily,
      weekly,
    },
    difficulty: {
      easyAccuracy,
      mediumAccuracy,
      hardAccuracy,
    },
    rankings: {
      topSubjects,
      bottomSubjects,
      topChapters,
      bottomChapters,
      topTopics,
      bottomTopics,
    },
    goals: {
      isEnabled: goal.isEnabled,
      targetAccuracy: goal.targetAccuracy,
      weeklyPracticeGoal: goal.weeklyPracticeGoal,
      monthlyTestGoal: goal.monthlyTestGoal,
      questionsPerWeekGoal: goal.questionsPerWeekGoal,
      accuracyProgress,
      weeklyTestsCompleted,
      weeklyTestsProgress,
      monthlyTestsCompleted,
      monthlyTestsProgress,
      weeklyQuestionsCompleted: weeklyAnswers,
      weeklyQuestionsProgress,
    },
    insights: {
      highestAccuracySubject,
      lowestAccuracySubject,
      fastestSubject,
      slowestSubject,
      mostImprovedSubject,
      highestSkipRateSubject,
      highestIncorrectRateSubject,
      mostPracticedSubject,
      leastPracticedSubject,
      statements,
    },
    achievements,
    trends: {
      scoreHistory,
      weeklyActivity,
      monthlyActivity,
      timeHistory,
    },
  };
};
