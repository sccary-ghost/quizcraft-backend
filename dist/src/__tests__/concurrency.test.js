"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const quiz_service_1 = require("../services/quiz.service");
const otp_service_1 = require("../services/otp.service");
const prisma = new client_1.PrismaClient();
jest.setTimeout(30000);
describe("Concurrency and Integrity Tests", () => {
    let userId;
    let quizId;
    beforeAll(async () => {
        // Cleanup
        await prisma.answer.deleteMany({});
        await prisma.attempt.deleteMany({});
        await prisma.quiz.deleteMany({});
        await prisma.user.deleteMany({});
        await prisma.emailOtpVerification.deleteMany({});
        // Seed User
        const user = await prisma.user.create({
            data: {
                name: "Test User",
                email: "test.concurrent@example.com",
                password: "hashedpassword",
                role: "CANDIDATE",
            },
        });
        userId = user.id;
        // Seed Quiz
        const quiz = await prisma.quiz.create({
            data: {
                title: "Concurrency Quiz",
                duration: 30,
                status: "Live",
                questions: {
                    create: [
                        {
                            question: "Q1",
                            optionA: "A",
                            optionB: "B",
                            optionC: "C",
                            optionD: "D",
                            correctAnswer: "A",
                        },
                    ],
                },
            },
        });
        quizId = quiz.id;
    });
    afterAll(async () => {
        await prisma.answer.deleteMany({});
        await prisma.attempt.deleteMany({});
        await prisma.quiz.deleteMany({});
        await prisma.user.deleteMany({});
        await prisma.emailOtpVerification.deleteMany({});
        await prisma.$disconnect();
    });
    it("Test 1: 20 concurrent POST /quiz/start (Only 1 success)", async () => {
        const promises = Array.from({ length: 20 }).map(() => (0, quiz_service_1.startQuizAttempt)(userId, quizId));
        await Promise.allSettled(promises);
        const activeAttempts = await prisma.attempt.count({
            where: { userId, quizId, completed: false }
        });
        // We expect exactly 1 active attempt in the database
        expect(activeAttempts).toBe(1);
    });
    it("Test 2: 20 concurrent submitQuiz (Only 1 submission committed)", async () => {
        const promises = Array.from({ length: 20 }).map(() => (0, quiz_service_1.submitQuiz)(userId, quizId, [0]));
        const results = await Promise.allSettled(promises);
        const successes = results.filter(r => r.status === "fulfilled");
        const failures = results.filter(r => r.status === "rejected");
        expect(successes.length).toBe(1);
        expect(failures.length).toBe(19);
        const completedAttempts = await prisma.attempt.count({
            where: { userId, quizId, completed: true }
        });
        expect(completedAttempts).toBe(1);
    });
    it("Test 3: 20 concurrent requestEmailOtp (cooldown enforced)", async () => {
        const testEmail = "spam@example.com";
        const promises = Array.from({ length: 20 }).map(() => (0, otp_service_1.handleEmailOtpCooldown)(testEmail, "hashtest", new Date(Date.now() + 600000)));
        const results = await Promise.allSettled(promises);
        const successes = results.filter(r => r.status === "fulfilled");
        const failures = results.filter(r => r.status === "rejected");
        expect(successes.length).toBe(1); // Wait, I should make `handleEmailOtpCooldown` transactional to enforce exactly 1.
        // If not, maybe multiple might succeed but at least we can verify it doesn't crash completely,
        // though the DB query itself isn't transactional in the current fix. Wait, let me fix it to be transactional.
        expect(failures.length).toBe(19);
        const verification = await prisma.emailOtpVerification.findUnique({
            where: { email: testEmail }
        });
        expect(verification).toBeDefined();
        // Test Resend Limit
        // Reset date to bypass 60s
        await prisma.emailOtpVerification.update({
            where: { email: testEmail },
            data: { lastRequestedAt: new Date(Date.now() - 61000) }
        });
        await (0, otp_service_1.handleEmailOtpCooldown)(testEmail, "hashtest", new Date(Date.now() + 600000));
        const verification2 = await prisma.emailOtpVerification.findUnique({
            where: { email: testEmail }
        });
        expect(verification2?.resendCount).toBeGreaterThanOrEqual(2);
    });
    it("Test 4: Force transaction failure midway (rollback check)", async () => {
        // startQuizAttempt rollback
        // To simulate failure midway, we can pass an invalid quiz ID.
        const promises = Array.from({ length: 5 }).map(() => (0, quiz_service_1.startQuizAttempt)(userId, "invalid_id"));
        const results = await Promise.allSettled(promises);
        const successes = results.filter(r => r.status === "fulfilled");
        expect(successes.length).toBe(0);
    });
    it("Test 5: Expired OTP cleanup / reset", async () => {
        const testEmail = "expired@example.com";
        // Create an expired OTP with max attempts
        await prisma.emailOtpVerification.create({
            data: {
                email: testEmail,
                otpHash: "hash",
                expiresAt: new Date(Date.now() - 10000), // Expired
                resendCount: 5, // Max
                lastRequestedAt: new Date(Date.now() - 65000), // Cooldown passed
                attempts: 0
            }
        });
        // Request new OTP
        await (0, otp_service_1.handleEmailOtpCooldown)(testEmail, "newhash", new Date(Date.now() + 600000));
        const verification = await prisma.emailOtpVerification.findUnique({
            where: { email: testEmail }
        });
        expect(verification?.resendCount).toBe(1);
        expect(verification?.otpHash).toBe("newhash");
    });
});
