import { registerUser, loginUser } from '../services/auth.service';
import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('../utils/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    }
  }
}));

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'testsecret';
  });

  describe('registerUser', () => {
    it('should successfully register a user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        mobileNumber: '1234567890',
        isActive: true,
        role: 'CANDIDATE',
        createdAt: new Date(),
      });

      const result = await registerUser('John Doe', 'john@example.com', 'password123', '1234567890');
      
      expect(result.message).toBe('User created successfully');
      expect(result.user.email).toBe('john@example.com');
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should fail if email is already registered', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: '1', email: 'john@example.com' });

      await expect(registerUser('John Doe', 'john@example.com', 'password123', '1234567890'))
        .rejects.toThrow('Email already registered');
    });

    it('should fail for disposable emails', async () => {
      await expect(registerUser('John Doe', 'john@mailinator.com', 'password123', '1234567890'))
        .rejects.toThrow('Registration from temporary/disposable email providers is not allowed');
    });
  });

  describe('loginUser', () => {
    it('should successfully login a user', async () => {
      const mockUser = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashedPassword',
        isActive: true,
        role: 'CANDIDATE',
      };
      
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (jwt.sign as jest.Mock).mockReturnValue('mockJwtToken');

      const result = await loginUser('john@example.com', 'password123');
      
      expect(result.message).toBe('Login successful');
      expect(result.token).toBe('mockJwtToken');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should fail for inactive user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'john@example.com',
        isActive: false,
      });

      await expect(loginUser('john@example.com', 'password123'))
        .rejects.toThrow('Your account has been deactivated');
    });
  });
});
