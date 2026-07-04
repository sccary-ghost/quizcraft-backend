"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.logout = exports.login = exports.register = exports.sendOtp = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const auth_service_1 = require("../services/auth.service");
const auditLogger_1 = require("../utils/auditLogger");
// Helper to hash OTP safely
const hashOtp = (otp) => {
    return crypto_1.default.createHash("sha256").update(otp).digest("hex");
};
// Send OTP controller
const sendOtp = async (req, res) => {
    try {
        const { mobileNumber } = req.body;
        // Validate mobile number format
        if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
            return res.status(400).json({
                message: "Mobile number must be exactly 10 digits and numeric only",
            });
        }
        // Check if mobile number is already registered in User table
        const existingUser = await prisma_1.default.user.findUnique({
            where: { mobileNumber },
        });
        if (existingUser) {
            return res.status(400).json({
                message: "Mobile number already registered",
            });
        }
        // Generate 6-digit numeric OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = hashOtp(otpCode);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
        const existingVerification = await prisma_1.default.otpVerification.findUnique({
            where: { mobileNumber },
        });
        if (existingVerification) {
            const now = Date.now();
            const lastRequested = new Date(existingVerification.lastRequestedAt).getTime();
            // Enforce 60-second cooldown
            if (now - lastRequested < 60000) {
                const secondsLeft = Math.ceil((60000 - (now - lastRequested)) / 1000);
                return res.status(400).json({
                    message: `Please wait ${secondsLeft} seconds before requesting a new OTP.`,
                });
            }
            // Limit resend attempts (max 5 resends)
            if (existingVerification.resendCount >= 5) {
                // If expired, reset counts, otherwise reject
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
                    return res.status(429).json({
                        message: "Maximum OTP resend attempts exceeded. Please try again after 5 minutes.",
                    });
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
        // Mock SMS delivery by logging to console
        console.log("\n========================================");
        console.log(`[SMS MOCK] OTP for mobile number ${mobileNumber} is: ${otpCode}`);
        console.log("========================================\n");
        res.json({
            message: "OTP sent successfully. Please check the backend console log for code.",
        });
    }
    catch (error) {
        res.status(500).json({
            message: error.message || "Failed to send OTP",
        });
    }
};
exports.sendOtp = sendOtp;
// Register controller with OTP validation
const register = async (req, res) => {
    const { name, email, password, mobileNumber, otp } = req.body;
    try {
        if (!otp) {
            return res.status(400).json({ message: "OTP is mandatory for registration" });
        }
        if (!mobileNumber) {
            return res.status(400).json({ message: "Mobile number is mandatory" });
        }
        // Retrieve verification record
        const verification = await prisma_1.default.otpVerification.findUnique({
            where: { mobileNumber },
        });
        if (!verification) {
            return res.status(400).json({ message: "OTP verification not requested or expired" });
        }
        // Check expiration
        if (new Date(verification.expiresAt).getTime() < Date.now()) {
            return res.status(400).json({ message: "OTP has expired. Please request a new one." });
        }
        // Check failed attempts (brute-force defense)
        if (verification.attempts >= 5) {
            await prisma_1.default.otpVerification.delete({ where: { mobileNumber } });
            return res.status(429).json({ message: "Too many failed attempts. Please request a new OTP." });
        }
        // Match OTP
        const incomingHash = hashOtp(otp);
        if (verification.otpHash !== incomingHash) {
            await prisma_1.default.otpVerification.update({
                where: { mobileNumber },
                data: { attempts: verification.attempts + 1 },
            });
            return res.status(400).json({ message: "Invalid OTP code" });
        }
        // Create user in database
        const result = await (0, auth_service_1.registerUser)(name, email, password, mobileNumber);
        // Clean up verification
        await prisma_1.default.otpVerification.delete({ where: { mobileNumber } });
        // Log registration action
        await (0, auditLogger_1.logAuditAction)(req, "Candidate Registered", result.user.id, {
            userId: result.user.id,
            userName: result.user.email,
        });
        // Auto-login upon registration
        const token = jsonwebtoken_1.default.sign({
            userId: result.user.id,
            email: result.user.email,
            role: result.user.role,
        }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });
        res.json({
            message: "Registration successful",
            token,
            user: result.user,
        });
    }
    catch (error) {
        res.status(400).json({
            message: error.message,
        });
    }
};
exports.register = register;
// Login controller
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await (0, auth_service_1.loginUser)(email, password);
        // Log login action
        await (0, auditLogger_1.logAuditAction)(req, "Login", result.user.id, {
            userId: result.user.id,
            userName: result.user.email,
        });
        res.json(result);
    }
    catch (error) {
        res.status(400).json({
            message: error.message,
        });
    }
};
exports.login = login;
const logout = async (req, res) => {
    try {
        await (0, auditLogger_1.logAuditAction)(req, "Logout");
        res.json({ message: "Logout successful" });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.logout = logout;
// Get profile controller (me)
const getMe = async (req, res) => {
    res.json({
        user: req.user,
    });
};
exports.getMe = getMe;
