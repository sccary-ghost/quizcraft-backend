"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeSession = exports.getActiveSessions = exports.verifyEmailChange = exports.requestEmailChange = exports.verifyMobileChange = exports.requestMobileChange = exports.uploadProfilePhoto = exports.changePassword = exports.updateProfile = exports.getMe = exports.logout = exports.login = exports.register = exports.sendOtp = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
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
        // Record Active Session
        const ipAddress = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers["user-agent"];
        await prisma_1.default.session.create({
            data: {
                userId: result.user.id,
                token,
                ipAddress,
                userAgent,
            },
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
        // Record Active Session
        const ipAddress = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers["user-agent"];
        await prisma_1.default.session.create({
            data: {
                userId: result.user.id,
                token: result.token,
                ipAddress,
                userAgent,
            },
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
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(" ")[1];
            // Revoke this session from database
            await prisma_1.default.session.deleteMany({
                where: { token },
            });
        }
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
    try {
        const userId = req.user.userId;
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                mobileNumber: user.mobileNumber,
                profilePhoto: user.profilePhoto,
                role: user.role,
                lastLogin: user.lastLogin,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMe = getMe;
// Update personal details (Name only)
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name } = req.body;
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ message: "Name is required" });
        }
        const updated = await prisma_1.default.user.update({
            where: { id: userId },
            data: { name: name.trim() },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Profile Details Updated", userId);
        res.json({
            message: "Profile updated successfully",
            user: {
                id: updated.id,
                name: updated.name,
                email: updated.email,
                mobileNumber: updated.mobileNumber,
                profilePhoto: updated.profilePhoto,
                role: updated.role,
            },
        });
    }
    catch (error) {
        res.status(550).json({ message: error.message });
    }
};
exports.updateProfile = updateProfile;
// Change Password
const changePassword = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "Old password and new password are required" });
        }
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const isMatch = await bcrypt_1.default.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect current password" });
        }
        const hashed = await bcrypt_1.default.hash(newPassword, 10);
        await prisma_1.default.user.update({
            where: { id: userId },
            data: { password: hashed },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Password Changed", userId);
        res.json({ message: "Password updated successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.changePassword = changePassword;
// Upload Profile Photo
const uploadProfilePhoto = async (req, res) => {
    try {
        const userId = req.user.userId;
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const fileName = `${Date.now()}-avatar-${req.file.originalname.replace(/\s+/g, "_")}`;
        const uploadsDir = path_1.default.join(__dirname, "../../uploads");
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        }
        const filePath = path_1.default.join(uploadsDir, fileName);
        fs_1.default.writeFileSync(filePath, req.file.buffer);
        const profilePhotoUrl = `${req.protocol}://${req.get("host")}/uploads/${fileName}`;
        await prisma_1.default.user.update({
            where: { id: userId },
            data: { profilePhoto: profilePhotoUrl },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Profile Photo Updated", userId);
        res.json({
            message: "Profile photo updated successfully",
            profilePhoto: profilePhotoUrl,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.uploadProfilePhoto = uploadProfilePhoto;
// Request Mobile Change (OTP verification)
const requestMobileChange = async (req, res) => {
    try {
        const { newMobileNumber } = req.body;
        if (!newMobileNumber || !/^\d{10}$/.test(newMobileNumber)) {
            return res.status(400).json({ message: "New mobile number must be exactly 10 digits" });
        }
        const existing = await prisma_1.default.user.findUnique({
            where: { mobileNumber: newMobileNumber },
        });
        if (existing) {
            return res.status(400).json({ message: "Mobile number is already in use by another account" });
        }
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = hashOtp(otpCode);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await prisma_1.default.otpVerification.upsert({
            where: { mobileNumber: newMobileNumber },
            update: {
                otpHash,
                expiresAt,
                attempts: 0,
                resendCount: 1,
                lastRequestedAt: new Date(),
            },
            create: {
                mobileNumber: newMobileNumber,
                otpHash,
                expiresAt,
                attempts: 0,
                resendCount: 1,
                lastRequestedAt: new Date(),
            },
        });
        console.log("\n========================================");
        console.log(`[SMS MOCK] Change Mobile OTP for ${newMobileNumber} is: ${otpCode}`);
        console.log("========================================\n");
        res.json({ message: "OTP sent. Check console logs for code." });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.requestMobileChange = requestMobileChange;
// Verify Mobile Change
const verifyMobileChange = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { newMobileNumber, otp } = req.body;
        if (!newMobileNumber || !otp) {
            return res.status(400).json({ message: "newMobileNumber and otp are required" });
        }
        const verification = await prisma_1.default.otpVerification.findUnique({
            where: { mobileNumber: newMobileNumber },
        });
        if (!verification || new Date(verification.expiresAt).getTime() < Date.now()) {
            return res.status(400).json({ message: "OTP verification record not found or expired" });
        }
        const incomingHash = hashOtp(otp);
        if (verification.otpHash !== incomingHash) {
            await prisma_1.default.otpVerification.update({
                where: { mobileNumber: newMobileNumber },
                data: { attempts: verification.attempts + 1 },
            });
            return res.status(400).json({ message: "Invalid OTP code" });
        }
        // Update user phone
        await prisma_1.default.user.update({
            where: { id: userId },
            data: { mobileNumber: newMobileNumber },
        });
        await prisma_1.default.otpVerification.delete({
            where: { mobileNumber: newMobileNumber },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Mobile Number Changed", userId);
        res.json({ message: "Mobile number updated successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.verifyMobileChange = verifyMobileChange;
// Request Email Change (OTP verification)
const requestEmailChange = async (req, res) => {
    try {
        const { newEmail } = req.body;
        if (!newEmail || !/^\S+@\S+\.\S+$/.test(newEmail)) {
            return res.status(400).json({ message: "Please provide a valid email address" });
        }
        const existing = await prisma_1.default.user.findUnique({
            where: { email: newEmail },
        });
        if (existing) {
            return res.status(400).json({ message: "Email is already registered to another account" });
        }
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = hashOtp(otpCode);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await prisma_1.default.emailOtpVerification.upsert({
            where: { email: newEmail },
            update: {
                otpHash,
                expiresAt,
                attempts: 0,
            },
            create: {
                email: newEmail,
                otpHash,
                expiresAt,
                attempts: 0,
            },
        });
        console.log("\n========================================");
        console.log(`[EMAIL MOCK] Change Email OTP for ${newEmail} is: ${otpCode}`);
        console.log("========================================\n");
        res.json({ message: "OTP sent. Check console logs for code." });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.requestEmailChange = requestEmailChange;
// Verify Email Change
const verifyEmailChange = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { newEmail, otp } = req.body;
        if (!newEmail || !otp) {
            return res.status(400).json({ message: "newEmail and otp are required" });
        }
        const verification = await prisma_1.default.emailOtpVerification.findUnique({
            where: { email: newEmail },
        });
        if (!verification || new Date(verification.expiresAt).getTime() < Date.now()) {
            return res.status(400).json({ message: "OTP verification record not found or expired" });
        }
        const incomingHash = hashOtp(otp);
        if (verification.otpHash !== incomingHash) {
            await prisma_1.default.emailOtpVerification.update({
                where: { email: newEmail },
                data: { attempts: verification.attempts + 1 },
            });
            return res.status(400).json({ message: "Invalid OTP code" });
        }
        // Update user email
        await prisma_1.default.user.update({
            where: { id: userId },
            data: { email: newEmail },
        });
        await prisma_1.default.emailOtpVerification.delete({
            where: { email: newEmail },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Email Changed", userId);
        res.json({ message: "Email updated successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.verifyEmailChange = verifyEmailChange;
// Get Active Sessions list
const getActiveSessions = async (req, res) => {
    try {
        const userId = req.user.userId;
        const currentToken = (req.headers.authorization?.split(" ")[1] || "");
        const dbSessions = await prisma_1.default.session.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
        const sessions = dbSessions.map((s) => ({
            id: s.id,
            ipAddress: s.ipAddress || "Unknown",
            userAgent: s.userAgent || "Unknown",
            isCurrent: s.token === currentToken,
            createdAt: s.createdAt,
        }));
        res.json(sessions);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getActiveSessions = getActiveSessions;
// Revoke/Terminating specific session
const revokeSession = async (req, res) => {
    try {
        const userId = req.user.userId;
        const id = req.params.id;
        const session = await prisma_1.default.session.findFirst({
            where: { id, userId },
        });
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }
        await prisma_1.default.session.delete({
            where: { id },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Session Revoked", id);
        res.json({ message: "Session terminated successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.revokeSession = revokeSession;
