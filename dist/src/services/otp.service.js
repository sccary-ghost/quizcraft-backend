"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmailOtp = exports.verifyMobileOtp = exports.handleEmailOtpCooldown = exports.handleMobileOtpCooldown = exports.generateOtp = exports.hashOtp = void 0;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const hashOtp = (otp) => {
    return crypto_1.default.createHash("sha256").update(otp).digest("hex");
};
exports.hashOtp = hashOtp;
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
exports.generateOtp = generateOtp;
const handleMobileOtpCooldown = async (mobileNumber, otpHash, expiresAt) => {
    const existingVerification = await prisma_1.default.otpVerification.findUnique({
        where: { mobileNumber },
    });
    if (existingVerification) {
        const now = Date.now();
        const lastRequested = new Date(existingVerification.lastRequestedAt).getTime();
        // Enforce 60-second cooldown
        if (now - lastRequested < 60000) {
            const secondsLeft = Math.ceil((60000 - (now - lastRequested)) / 1000);
            throw new Error(`Please wait ${secondsLeft} seconds before requesting a new OTP.`);
        }
        // Limit resend attempts (max 5 resends)
        if (existingVerification.resendCount >= 5) {
            if (new Date(existingVerification.expiresAt).getTime() < now) {
                await prisma_1.default.otpVerification.update({
                    where: { mobileNumber },
                    data: {
                        otpHash,
                        expiresAt,
                        attempts: 0,
                        resendCount: 1,
                        lastRequestedAt: new Date(),
                    },
                });
            }
            else {
                throw new Error("Maximum OTP resend attempts exceeded. Please try again after 5 minutes.");
            }
        }
        else {
            await prisma_1.default.otpVerification.update({
                where: { mobileNumber },
                data: {
                    otpHash,
                    expiresAt,
                    attempts: 0,
                    resendCount: existingVerification.resendCount + 1,
                    lastRequestedAt: new Date(),
                },
            });
        }
    }
    else {
        await prisma_1.default.otpVerification.create({
            data: {
                mobileNumber,
                otpHash,
                expiresAt,
                attempts: 0,
                resendCount: 1,
                lastRequestedAt: new Date(),
            },
        });
    }
};
exports.handleMobileOtpCooldown = handleMobileOtpCooldown;
const handleEmailOtpCooldown = async (email, otpHash, expiresAt) => {
    await prisma_1.default.$transaction(async (tx) => {
        const existingVerification = await tx.emailOtpVerification.findUnique({
            where: { email },
        });
        if (existingVerification) {
            const now = Date.now();
            const lastRequested = new Date(existingVerification.lastRequestedAt).getTime();
            // Enforce 60-second cooldown
            if (now - lastRequested < 60000) {
                const secondsLeft = Math.ceil((60000 - (now - lastRequested)) / 1000);
                throw new Error(`Please wait ${secondsLeft} seconds before requesting a new OTP.`);
            }
            // Limit resend attempts (max 5 resends)
            if (existingVerification.resendCount >= 5) {
                if (new Date(existingVerification.expiresAt).getTime() < now) {
                    await tx.emailOtpVerification.update({
                        where: { email },
                        data: {
                            otpHash,
                            expiresAt,
                            attempts: 0,
                            resendCount: 1,
                            lastRequestedAt: new Date(),
                        },
                    });
                }
                else {
                    throw new Error("Maximum OTP resend attempts exceeded. Please try again after 5 minutes.");
                }
            }
            else {
                await tx.emailOtpVerification.update({
                    where: { email },
                    data: {
                        otpHash,
                        expiresAt,
                        attempts: 0,
                        resendCount: existingVerification.resendCount + 1,
                        lastRequestedAt: new Date(),
                    },
                });
            }
        }
        else {
            await tx.emailOtpVerification.create({
                data: {
                    email,
                    otpHash,
                    expiresAt,
                    attempts: 0,
                    resendCount: 1,
                    lastRequestedAt: new Date(),
                },
            });
        }
    }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
};
exports.handleEmailOtpCooldown = handleEmailOtpCooldown;
const verifyMobileOtp = async (mobileNumber, incomingOtp) => {
    const verification = await prisma_1.default.otpVerification.findUnique({
        where: { mobileNumber },
    });
    if (!verification) {
        throw new Error("OTP verification not requested or expired");
    }
    if (new Date(verification.expiresAt).getTime() < Date.now()) {
        throw new Error("OTP has expired. Please request a new one.");
    }
    if (verification.attempts >= 5) {
        await prisma_1.default.otpVerification.delete({ where: { mobileNumber } });
        throw new Error("Too many failed attempts. Please request a new OTP.");
    }
    const incomingHash = (0, exports.hashOtp)(incomingOtp);
    if (verification.otpHash !== incomingHash) {
        await prisma_1.default.otpVerification.update({
            where: { mobileNumber },
            data: { attempts: verification.attempts + 1 },
        });
        return false; // Invalid
    }
    return true; // Valid
};
exports.verifyMobileOtp = verifyMobileOtp;
const verifyEmailOtp = async (email, incomingOtp) => {
    const verification = await prisma_1.default.emailOtpVerification.findUnique({
        where: { email },
    });
    if (!verification) {
        throw new Error("OTP verification not requested or expired");
    }
    if (new Date(verification.expiresAt).getTime() < Date.now()) {
        throw new Error("OTP has expired. Please request a new one.");
    }
    if (verification.attempts >= 5) {
        await prisma_1.default.emailOtpVerification.delete({ where: { email } });
        throw new Error("Too many failed attempts. Please request a new OTP.");
    }
    const incomingHash = (0, exports.hashOtp)(incomingOtp);
    if (verification.otpHash !== incomingHash) {
        await prisma_1.default.emailOtpVerification.update({
            where: { email },
            data: { attempts: verification.attempts + 1 },
        });
        return false;
    }
    return true;
};
exports.verifyEmailOtp = verifyEmailOtp;
