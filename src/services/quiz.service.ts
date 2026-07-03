import prisma from "../utils/prisma";

export const updateQuizStatuses = async () => {
  try {
    const now = new Date();
    const quizzes = await prisma.quiz.findMany({
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
      } else if (quiz.availabilityMode === "SCHEDULED" && quiz.startDate) {
        const start = new Date(quiz.startDate);
        const end = quiz.endDate ? new Date(quiz.endDate) : null;

        if (now < start) {
          computedStatus = "Scheduled";
        } else if (end && now > end) {
          const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          if (end < oneDayAgo) {
            computedStatus = "Archived";
          } else {
            computedStatus = "Completed";
          }
        } else {
          computedStatus = "Live";
        }
      }

      if (computedStatus !== quiz.status) {
        await prisma.quiz.update({
          where: { id: quiz.id },
          data: { status: computedStatus },
        });
      }
    }
  } catch (e) {
    console.error("Failed to auto-update quiz statuses:", e);
  }
};

export const createQuiz = async (
  title: string,
  description: string,
  duration: number,
  sections?: any[],
  schedulingData?: any
) => {
  const quiz = await prisma.quiz.create({
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
        create: sections.map((sec: any) => ({
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

export const addQuestion = async (
  quizId: string,
  question: string,
  optionA: string,
  optionB: string,
  optionC: string,
  optionD: string,
  correctAnswer: string,
  explanation?: string,
  subject?: string,
  chapter?: string,
  topic?: string,
  sectionId?: string
) => {
  const newQuestion = await prisma.question.create({
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

  // Create version 1 revision immediately
  await prisma.questionRevision.create({
    data: {
      questionId: newQuestion.id,
      version: 1,
      question: newQuestion.question,
      optionA: newQuestion.optionA,
      optionB: newQuestion.optionB,
      optionC: newQuestion.optionC,
      optionD: newQuestion.optionD,
      correctAnswer: newQuestion.correctAnswer,
      explanation: newQuestion.explanation,
      subject: newQuestion.subject,
      chapter: newQuestion.chapter,
      topic: newQuestion.topic,
      status: newQuestion.status,
    },
  });

  return { message: "Question added successfully", question: newQuestion };
};

export const getQuizById = async (quizId: string, isAdmin = false) => {
  await updateQuizStatuses();
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { 
      questions: {
        where: { isDeleted: false },
        orderBy: {
          createdAt: "asc"
        }
      },
      sections: {
        orderBy: {
          order: "asc"
        }
      }
    },
  });
  if (!quiz) return null;

  // Candidate cbt test attempts should only render Published questions
  if (!isAdmin) {
    quiz.questions = quiz.questions.filter((q) => q.status === "Published");
  }

  return quiz;
};

export const getAllQuizzes = async () => {
  await updateQuizStatuses();
  return prisma.quiz.findMany({
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

const getQuestionScoreConfig = (quiz: any, question: any) => {
  if (question.sectionId && quiz.sections) {
    const section = quiz.sections.find((s: any) => s.id === question.sectionId);
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
    } catch (e) {
      // ignore
    }
  }
  return { marks: 4.0, negativeMarks: 1.0 };
};

export const submitQuiz = async (
  userId: string,
  quizId: string,
  answers: (number | null)[],
  questionTimes: Record<number, number> = {}
) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { 
      questions: {
        where: { isDeleted: false }
      },
      sections: true
    },
  });
  if (!quiz) throw new Error("Quiz not found");

  let score = 0;
  let maxScore = 0;
  quiz.questions.forEach((question, index) => {
    const { marks, negativeMarks } = getQuestionScoreConfig(quiz, question);
    maxScore += marks;
    const selectedIndex = answers[index];
    if (selectedIndex === null || selectedIndex === undefined) return;
    const options = [question.optionA, question.optionB, question.optionC, question.optionD];
    const selectedText = options[selectedIndex]?.trim();
    const correctText = question.correctAnswer?.trim();
    if (selectedText && correctText && selectedText === correctText) {
      score += marks;
    } else if (selectedText) {
      score -= negativeMarks;
    }
  });

  const total = quiz.questions.length;
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

  // Find an existing in-progress attempt to update
  let attempt = await prisma.attempt.findFirst({
    where: {
      userId,
      quizId,
      completed: false,
    },
  });

  if (attempt) {
    attempt = await prisma.attempt.update({
      where: { id: attempt.id },
      data: { score, percentage, completed: true, submittedAt: new Date() },
    });
    
    // Clear any previous answers for this attempt in case it was resumed
    await prisma.answer.deleteMany({
      where: { attemptId: attempt.id },
    });
  } else {
    attempt = await prisma.attempt.create({
      data: { userId, quizId, score, percentage, completed: true },
    });
  }

  await prisma.answer.createMany({
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

export const getAttemptById = async (attemptId: string) => {
  return prisma.attempt.findUnique({
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

export const getUserHistory = async (userId: string) => {
  // Return completed attempts or all? Completed is better so unfinished aren't shown as completed score 0 tests.
  return prisma.attempt.findMany({
    where: { userId, completed: true },
    include: { quiz: true },
    orderBy: { submittedAt: "desc" },
  });
};

export const updateQuestion = async (
  questionId: string,
  questionText: string,
  optionA: string,
  optionB: string,
  optionC: string,
  optionD: string,
  correctAnswer: string,
  explanation?: string | null,
  subject?: string | null,
  chapter?: string | null,
  topic?: string | null,
  status?: string
) => {
  // Fetch current question
  const current = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!current) throw new Error("Question not found");

  // Lazy-create version 1 revision if it doesn't exist
  const hasV1 = await prisma.questionRevision.findFirst({
    where: { questionId, version: 1 },
  });
  if (!hasV1) {
    await prisma.questionRevision.create({
      data: {
        questionId,
        version: 1,
        question: current.question,
        optionA: current.optionA,
        optionB: current.optionB,
        optionC: current.optionC,
        optionD: current.optionD,
        correctAnswer: current.correctAnswer,
        explanation: current.explanation,
        subject: current.subject,
        chapter: current.chapter,
        topic: current.topic,
        status: current.status,
        createdAt: current.createdAt,
      },
    });
  }

  const nextVersion = current.version + 1;
  const newStatus = status !== undefined ? status : current.status;

  // Update active question
  const updated = await prisma.question.update({
    where: { id: questionId },
    data: {
      question: questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      explanation: explanation !== undefined ? explanation : current.explanation,
      subject: subject !== undefined ? subject : current.subject,
      chapter: chapter !== undefined ? chapter : current.chapter,
      topic: topic !== undefined ? topic : current.topic,
      status: newStatus,
      version: nextVersion,
    },
  });

  // Save the new revision
  await prisma.questionRevision.create({
    data: {
      questionId,
      version: nextVersion,
      question: updated.question,
      optionA: updated.optionA,
      optionB: updated.optionB,
      optionC: updated.optionC,
      optionD: updated.optionD,
      correctAnswer: updated.correctAnswer,
      explanation: updated.explanation,
      subject: updated.subject,
      chapter: updated.chapter,
      topic: updated.topic,
      status: updated.status,
    },
  });

  return updated;
};

/**
 * Retrieve all revision history for a question.
 */
export const getQuestionVersionsList = async (questionId: string) => {
  return prisma.questionRevision.findMany({
    where: { questionId },
    orderBy: { version: "desc" },
  });
};

/**
 * Restore a question to a specific previous revision.
 * This increments the active question version and logs it as a new revision.
 */
export const restoreQuestionRevision = async (questionId: string, revisionId: string) => {
  // Fetch revision details
  const revision = await prisma.questionRevision.findUnique({
    where: { id: revisionId },
  });
  if (!revision || revision.questionId !== questionId) {
    throw new Error("Revision not found");
  }

  // Fetch current question version
  const current = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!current) throw new Error("Question not found");

  const nextVersion = current.version + 1;

  // Restore active question content
  const restored = await prisma.question.update({
    where: { id: questionId },
    data: {
      question: revision.question,
      optionA: revision.optionA,
      optionB: revision.optionB,
      optionC: revision.optionC,
      optionD: revision.optionD,
      correctAnswer: revision.correctAnswer,
      explanation: revision.explanation,
      subject: revision.subject,
      chapter: revision.chapter,
      topic: revision.topic,
      status: revision.status,
      version: nextVersion,
    },
  });

  // Log restored version as a new revision
  await prisma.questionRevision.create({
    data: {
      questionId,
      version: nextVersion,
      question: restored.question,
      optionA: restored.optionA,
      optionB: restored.optionB,
      optionC: restored.optionC,
      optionD: restored.optionD,
      correctAnswer: restored.correctAnswer,
      explanation: restored.explanation,
      subject: restored.subject,
      chapter: restored.chapter,
      topic: restored.topic,
      status: restored.status,
    },
  });

  return restored;
};

/**
 * Update a question's status specifically, and log it in history.
 */
export const updateQuestionStatus = async (questionId: string, status: string) => {
  const current = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!current) throw new Error("Question not found");

  return updateQuestion(
    questionId,
    current.question,
    current.optionA,
    current.optionB,
    current.optionC,
    current.optionD,
    current.correctAnswer,
    current.explanation,
    current.subject,
    current.chapter,
    current.topic,
    status
  );
};

/**
 * Add a comment from a reviewer.
 */
export const addReviewComment = async (questionId: string, comment: string, authorName = "Reviewer") => {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!question) throw new Error("Question not found");

  return prisma.reviewComment.create({
    data: {
      questionId,
      comment,
      authorName,
    },
  });
};

/**
 * Retrieve the review comments thread for a question.
 */
export const getReviewCommentsList = async (questionId: string) => {
  return prisma.reviewComment.findMany({
    where: { questionId },
    orderBy: { createdAt: "asc" },
  });
};

export const deleteQuestion = async (questionId: string) => {
  return prisma.question.update({
    where: { id: questionId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });
};

export const restoreQuestion = async (questionId: string) => {
  return prisma.question.update({
    where: { id: questionId },
    data: {
      isDeleted: false,
      deletedAt: null,
    },
  });
};

export const deleteQuestionPermanently = async (questionId: string) => {
  await prisma.reviewComment.deleteMany({
    where: { questionId },
  });
  await prisma.questionRevision.deleteMany({
    where: { questionId },
  });
  await prisma.answer.deleteMany({
    where: { questionId },
  });
  return prisma.question.delete({
    where: { id: questionId },
  });
};

export const deleteQuizPermanently = async (quizId: string) => {
  const attempts = await prisma.attempt.findMany({
    where: { quizId },
  });
  const attemptIds = attempts.map(a => a.id);
  await prisma.answer.deleteMany({
    where: { attemptId: { in: attemptIds } },
  });
  await prisma.attempt.deleteMany({
    where: { quizId },
  });

  const questions = await prisma.question.findMany({
    where: { quizId },
  });
  const questionIds = questions.map(q => q.id);
  await prisma.reviewComment.deleteMany({
    where: { questionId: { in: questionIds } },
  });
  await prisma.questionRevision.deleteMany({
    where: { questionId: { in: questionIds } },
  });
  await prisma.question.deleteMany({
    where: { quizId },
  });

  await prisma.section.deleteMany({
    where: { quizId },
  });

  return prisma.quiz.delete({
    where: { id: quizId },
  });
};

export const getTrashItems = async () => {
  const quizzes = await prisma.quiz.findMany({
    where: { isDeleted: true },
    orderBy: { deletedAt: "desc" },
  });
  const questions = await prisma.question.findMany({
    where: { isDeleted: true },
    orderBy: { deletedAt: "desc" },
  });
  return { quizzes, questions };
};

export const moveQuizToTrash = async (quizId: string) => {
  return prisma.quiz.update({
    where: {
      id: quizId,
    },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });
};

export const restoreQuiz = async (quizId: string) => {
  return prisma.quiz.update({
    where: {
      id: quizId,
    },
    data: {
      isDeleted: false,
      deletedAt: null,
    },
  });
};

export const updateQuiz = async (
  quizId: string,
  title: string,
  description: string,
  duration: number,
  sections?: any[],
  schedulingData?: any
) => {
  const quiz = await prisma.quiz.update({
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
    await prisma.section.deleteMany({
      where: { quizId },
    });

    await prisma.section.createMany({
      data: sections.map((sec: any, idx: number) => ({
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

export const startQuizAttempt = async (userId: string, quizId: string) => {
  await updateQuizStatuses();

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
  });

  if (!quiz) throw new Error("Quiz not found");

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
  const existingAttempt = await prisma.attempt.findFirst({
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
  const attempt = await prisma.attempt.create({
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

export const exportDatabaseBackup = async () => {
  const users = await prisma.user.findMany();
  const quizzes = await prisma.quiz.findMany();
  const sections = await prisma.section.findMany();
  const questions = await prisma.question.findMany();
  const questionRevisions = await prisma.questionRevision.findMany();
  const reviewComments = await prisma.reviewComment.findMany();
  const attempts = await prisma.attempt.findMany();
  const answers = await prisma.answer.findMany();
  const auditLogs = await prisma.auditLog.findMany();

  return {
    users,
    quizzes,
    sections,
    questions,
    questionRevisions,
    reviewComments,
    attempts,
    answers,
    auditLogs,
  };
};

export const importDatabaseBackup = async (
  backupData: any,
  strategy: "merge" | "overwrite",
  currentAdminId?: string
) => {
  const {
    users = [],
    quizzes = [],
    sections = [],
    questions = [],
    questionRevisions = [],
    reviewComments = [],
    attempts = [],
    answers = [],
    auditLogs = [],
  } = backupData;

  const mapDates = (item: any) => {
    const mapped = { ...item };
    for (const key in mapped) {
      if (
        typeof mapped[key] === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(mapped[key])
      ) {
        mapped[key] = new Date(mapped[key]);
      }
    }
    return mapped;
  };

  if (strategy === "overwrite") {
    await prisma.$transaction(async (tx) => {
      // 1. Answers
      await tx.answer.deleteMany();
      // 2. Attempts
      await tx.attempt.deleteMany();
      // 3. ReviewComments
      await tx.reviewComment.deleteMany();
      // 4. Revisions
      await tx.questionRevision.deleteMany();
      // 5. Questions
      await tx.question.deleteMany();
      // 6. Sections
      await tx.section.deleteMany();
      // 7. Quizzes
      await tx.quiz.deleteMany();
      // 8. AuditLogs
      await tx.auditLog.deleteMany();
      // 9. Users
      await tx.user.deleteMany({
        where: currentAdminId ? { id: { not: currentAdminId } } : {},
      });

      // Insert all
      const usersToInsert = users
        .filter((u: any) => u.id !== currentAdminId)
        .map(mapDates);
      if (usersToInsert.length > 0) {
        await tx.user.createMany({ data: usersToInsert });
      }

      const quizzesToInsert = quizzes.map(mapDates);
      if (quizzesToInsert.length > 0) {
        await tx.quiz.createMany({ data: quizzesToInsert });
      }

      const sectionsToInsert = sections.map(mapDates);
      if (sectionsToInsert.length > 0) {
        await tx.section.createMany({ data: sectionsToInsert });
      }

      const questionsToInsert = questions.map(mapDates);
      if (questionsToInsert.length > 0) {
        await tx.question.createMany({ data: questionsToInsert });
      }

      const revisionsToInsert = questionRevisions.map(mapDates);
      if (revisionsToInsert.length > 0) {
        await tx.questionRevision.createMany({ data: revisionsToInsert });
      }

      const commentsToInsert = reviewComments.map(mapDates);
      if (commentsToInsert.length > 0) {
        await tx.reviewComment.createMany({ data: commentsToInsert });
      }

      const attemptsToInsert = attempts.map(mapDates);
      if (attemptsToInsert.length > 0) {
        await tx.attempt.createMany({ data: attemptsToInsert });
      }

      const answersToInsert = answers.map(mapDates);
      if (answersToInsert.length > 0) {
        await tx.answer.createMany({ data: answersToInsert });
      }

      const auditLogsToInsert = auditLogs.map(mapDates);
      if (auditLogsToInsert.length > 0) {
        await tx.auditLog.createMany({ data: auditLogsToInsert });
      }
    });
  } else {
    // Merge strategy
    const mergeModel = async (model: string, dataList: any[]) => {
      for (const item of dataList) {
        const exists = await (prisma as any)[model].findUnique({
          where: { id: item.id },
        });
        if (!exists) {
          await (prisma as any)[model].create({
            data: mapDates(item),
          });
        }
      }
    };

    await mergeModel("user", users);
    await mergeModel("quiz", quizzes);
    await mergeModel("section", sections);
    await mergeModel("question", questions);
    await mergeModel("questionRevision", questionRevisions);
    await mergeModel("reviewComment", reviewComments);
    await mergeModel("attempt", attempts);
    await mergeModel("answer", answers);
    await mergeModel("auditLog", auditLogs);
  }
};