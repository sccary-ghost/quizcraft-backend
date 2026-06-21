import prisma from "../utils/prisma";

export async function bulkUploadQuestions(
  quizId: string,
  rows: any[]
) {
  const questions = rows.map((row) => ({
    quizId,
    question: row.question,
    optionA: row.optionA,
    optionB: row.optionB,
    optionC: row.optionC,
    optionD: row.optionD,
    correctAnswer: row.correctAnswer,
  }));

  await prisma.question.createMany({
    data: questions,
  });

  return {
    message: `${questions.length} questions uploaded successfully`,
  };
}