import { createQuiz, getQuizById, startQuizAttempt } from '../services/quiz.service';
import prisma from '../utils/prisma';

jest.mock('../utils/prisma', () => {
  const mPrisma = {
    quiz: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    attempt: {
      findFirst: jest.fn(),
      create: jest.fn(),
    }
  };
  (mPrisma as any).$transaction = jest.fn(async (cb) => cb(mPrisma));
  return {
    __esModule: true,
    default: mPrisma
  };
});

describe('Quiz Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createQuiz', () => {
    it('should create a quiz successfully', async () => {
      const mockQuiz = {
        id: 'quiz-123',
        title: 'Mock Quiz',
        description: 'Description',
        duration: 30,
      };
      
      (prisma.quiz.create as jest.Mock).mockResolvedValue(mockQuiz);

      const result = await createQuiz('Mock Quiz', 'Description', 30);
      
      expect(result.message).toBe('Quiz created successfully');
      expect(result.quiz.title).toBe('Mock Quiz');
      expect(prisma.quiz.create).toHaveBeenCalled();
    });
  });

  describe('getQuizById', () => {
    it('should fetch a quiz by id and filter questions based on role', async () => {
      const mockQuiz = {
        id: 'quiz-123',
        status: 'Live',
        availabilityMode: 'IMMEDIATE',
        questions: [
          { id: 'q1', status: 'Published' },
          { id: 'q2', status: 'Draft' }
        ]
      };
      
      // We also mock findMany because of updateQuizStatuses
      (prisma.quiz.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue(mockQuiz);

      const result = await getQuizById('quiz-123', false);
      
      expect(result).toBeDefined();
      expect(result?.questions.length).toBe(1); // Non-admin gets only published
      expect(result?.questions[0].status).toBe('Published');
    });
  });

  describe('startQuizAttempt', () => {
    it('should start an attempt successfully', async () => {
      (prisma.quiz.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue({
        id: 'quiz-123',
        status: 'Live',
        availabilityMode: 'IMMEDIATE'
      });
      (prisma.attempt.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.attempt.create as jest.Mock).mockResolvedValue({ id: 'attempt-123' });

      const result = await startQuizAttempt('user-1', 'quiz-123');
      
      expect(result.message).toBe('Attempt started successfully');
      expect(result.attemptId).toBe('attempt-123');
    });

    it('should fail if quiz is draft', async () => {
      (prisma.quiz.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue({
        id: 'quiz-123',
        status: 'Draft'
      });

      await expect(startQuizAttempt('user-1', 'quiz-123'))
        .rejects.toThrow('This test is currently a draft and cannot be attempted.');
    });
  });
});
