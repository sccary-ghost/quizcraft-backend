"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_service_1 = require("../services/auth.service");
const prisma_1 = __importDefault(require("../utils/prisma"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
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
            prisma_1.default.user.findUnique.mockResolvedValue(null);
            bcrypt_1.default.hash.mockResolvedValue('hashedPassword');
            prisma_1.default.user.create.mockResolvedValue({
                id: '1',
                name: 'John Doe',
                email: 'john@example.com',
                mobileNumber: '1234567890',
                isActive: true,
                role: 'CANDIDATE',
                createdAt: new Date(),
            });
            const result = await (0, auth_service_1.registerUser)('John Doe', 'john@example.com', 'password123', '1234567890');
            expect(result.message).toBe('User created successfully');
            expect(result.user.email).toBe('john@example.com');
            expect(prisma_1.default.user.create).toHaveBeenCalled();
        });
        it('should fail if email is already registered', async () => {
            prisma_1.default.user.findUnique.mockResolvedValueOnce({ id: '1', email: 'john@example.com' });
            await expect((0, auth_service_1.registerUser)('John Doe', 'john@example.com', 'password123', '1234567890'))
                .rejects.toThrow('Email already registered');
        });
        it('should fail for disposable emails', async () => {
            await expect((0, auth_service_1.registerUser)('John Doe', 'john@mailinator.com', 'password123', '1234567890'))
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
            prisma_1.default.user.findUnique.mockResolvedValue(mockUser);
            bcrypt_1.default.compare.mockResolvedValue(true);
            prisma_1.default.user.update.mockResolvedValue(mockUser);
            jsonwebtoken_1.default.sign.mockReturnValue('mockJwtToken');
            const result = await (0, auth_service_1.loginUser)('john@example.com', 'password123');
            expect(result.message).toBe('Login successful');
            expect(result.token).toBe('mockJwtToken');
            expect(prisma_1.default.user.update).toHaveBeenCalled();
        });
        it('should fail for inactive user', async () => {
            prisma_1.default.user.findUnique.mockResolvedValue({
                id: '1',
                email: 'john@example.com',
                isActive: false,
            });
            await expect((0, auth_service_1.loginUser)('john@example.com', 'password123'))
                .rejects.toThrow('Your account has been deactivated');
        });
    });
});
