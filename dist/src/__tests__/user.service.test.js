"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_service_1 = require("../services/user.service");
const prisma_1 = __importDefault(require("../utils/prisma"));
jest.mock('../utils/prisma', () => ({
    __esModule: true,
    default: {
        user: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            findFirst: jest.fn(),
        },
        attempt: {
            findMany: jest.fn(),
            count: jest.fn(),
        }
    }
}));
describe('User Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('getCandidatesList', () => {
        it('should fetch candidates with attempt counts', async () => {
            const mockUsers = [
                { id: '1', name: 'Alice', email: 'alice@example.com', _count: { attempts: 2 } },
                { id: '2', name: 'Bob', email: 'bob@example.com', _count: { attempts: 0 } }
            ];
            prisma_1.default.user.findMany.mockResolvedValue(mockUsers);
            const candidates = await (0, user_service_1.getCandidatesList)();
            expect(candidates.length).toBe(2);
            expect(candidates[0].name).toBe('Alice');
            expect(candidates[0].attemptsCount).toBe(2);
            expect(prisma_1.default.user.findMany).toHaveBeenCalled();
        });
    });
    describe('updateCandidateDetails', () => {
        it('should update candidate details successfully', async () => {
            const mockUpdatedUser = { id: '1', name: 'Alice', isActive: false };
            prisma_1.default.user.findFirst.mockResolvedValue(null);
            prisma_1.default.user.update.mockResolvedValue(mockUpdatedUser);
            const result = await (0, user_service_1.updateCandidateDetails)('1', { isActive: false });
            expect(result.isActive).toBe(false);
            expect(prisma_1.default.user.update).toHaveBeenCalledWith({
                where: { id: '1' },
                data: { isActive: false }
            });
        });
        it('should throw error if email already exists', async () => {
            prisma_1.default.user.findFirst.mockResolvedValue({ id: '2' });
            await expect((0, user_service_1.updateCandidateDetails)('1', { email: 'exist@example.com' }))
                .rejects.toThrow('Email address already registered by another candidate');
        });
    });
});
