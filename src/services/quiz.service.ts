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
  return { message: "Question added successfully", question: newQuestion };
};

export const getQuizById = async (quizId: string) => {
  await updateQuizStatuses();
  return prisma.quiz.findUnique({
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
      questions: true,
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
  questionId: string, question: string, optionA: string, optionB: string, optionC: string, optionD: string, correctAnswer: string
) => {
  return prisma.question.update({
    where: { id: questionId },
    data: { question, optionA, optionB, optionC, optionD, correctAnswer },
  });
};

export const deleteQuestion = async (questionId: string) => {
  return prisma.question.delete({
    where: { id: questionId },
  });
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