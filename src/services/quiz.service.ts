import prisma from "../utils/prisma";

export const createQuiz = async (title: string, description: string, duration: number) => {
  const quiz = await prisma.quiz.create({
    data: { title, description, duration },
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
  topic?: string
) => {
  const newQuestion = await prisma.question.create({
    data: {
      quizId,
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
  return prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: true },
  });
};

export const getAllQuizzes = async () => {
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

export const submitQuiz = async (
  userId: string,
  quizId: string,
  answers: (number | null)[],
  questionTimes: Record<number, number> = {}
) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: true },
  });
  if (!quiz) throw new Error("Quiz not found");

  let score = 0;
  quiz.questions.forEach((question, index) => {
    const selectedIndex = answers[index];
    if (selectedIndex === null || selectedIndex === undefined) return;
    const options = [question.optionA, question.optionB, question.optionC, question.optionD];
    const selectedText = options[selectedIndex]?.trim();
    const correctText = question.correctAnswer?.trim();
    if (selectedText && correctText && selectedText === correctText) score++;
  });

  const total = quiz.questions.length;
  const percentage = total > 0 ? (score / total) * 100 : 0;

  const attempt = await prisma.attempt.create({
    data: { userId, quizId, score, percentage },
  });

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
      answers: { include: { question: true } },
      quiz: true,
    },
  });
};

export const getUserHistory = async (userId: string) => {
  return prisma.attempt.findMany({
    where: { userId },
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