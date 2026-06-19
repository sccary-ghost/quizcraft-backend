import prisma from "../utils/prisma";

export const createQuiz = async (
  title: string,
  description: string,
  duration: number
) => {
  const quiz = await prisma.quiz.create({
    data: {
      title,
      description,
      duration,
    },
  });

  return {
    message: "Quiz created successfully",
    quiz,
  };
};

export const addQuestion = async (
  quizId: string,
  question: string,
  optionA: string,
  optionB: string,
  optionC: string,
  optionD: string,
  correctAnswer: string
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
    },
  });

  return {
    message: "Question added successfully",
    question: newQuestion,
  };
};

export const getQuizById = async (
  quizId: string
) => {
  return prisma.quiz.findUnique({
    where: {
      id: quizId,
    },
    include: {
      questions: true,
    },
  });
};

export const submitQuiz = async (
  userId: string,
  quizId: string,
  answers: (number | null)[]
) => {
  const quiz = await prisma.quiz.findUnique({
    where: {
      id: quizId,
    },
    include: {
      questions: true,
    },
  });

  if (!quiz) {
    throw new Error("Quiz not found");
  }

  let score = 0;

  quiz.questions.forEach((question, index) => {
    const selectedIndex = answers[index];

    if (
      selectedIndex === null ||
      selectedIndex === undefined
    ) {
      return;
    }

    const options = [
      question.optionA,
      question.optionB,
      question.optionC,
      question.optionD,
    ];

    if (
      options[selectedIndex] ===
      question.correctAnswer
    ) {
      score++;
    }
  });

  const total = quiz.questions.length;
  const percentage = (score / total) * 100;

  const attempt = await prisma.attempt.create({
    data: {
      userId,
      quizId,
      score,
      percentage,
    },
  });

  await prisma.answer.createMany({
    data: quiz.questions.map(
      (question, index) => {
        const selectedIndex = answers[index];

        const options = [
          question.optionA,
          question.optionB,
          question.optionC,
          question.optionD,
        ];

        const selectedAnswer =
          selectedIndex === null ||
          selectedIndex === undefined
            ? null
            : options[selectedIndex];

        return {
          attemptId: attempt.id,
          questionId: question.id,
          selectedAnswer,
          isCorrect:
            selectedAnswer ===
            question.correctAnswer,
          timeSpent: 0,
        };
      }
    ),
  });

  return {
    score,
    total,
    percentage,
    attemptId: attempt.id,
  };
};

export const getAttemptById = async (
  attemptId: string
) => {
  return prisma.attempt.findUnique({
    where: {
      id: attemptId,
    },
    include: {
      answers: {
        include: {
          question: true,
        },
      },
    },
  });
};
export const getAllQuizzes = async () => {
  return prisma.quiz.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
};