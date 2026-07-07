"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeSession = exports.getActiveSessions = exports.verifyEmailChange = exports.requestEmailChange = exports.verifyMobileChange = exports.requestMobileChange = exports.uploadProfilePhoto = exports.changePassword = exports.updateProfile = exports.getMe = exports.logout = exports.login = exports.register = exports.sendOtp = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const auth_service_1 = require("../services/auth.service");
const auditLogger_1 = require("../utils/auditLogger");
const otp_service_1 = require("../services/otp.service");
// Send OTP controller
const sendOtp = async (req, res) => {
    try {
        const { mobileNumber } = req.body;
        const existingUser = await prisma_1.default.user.findUnique({
            where: { mobileNumber },
        });
        if (existingUser) {
            return res.status(400).json({ message: "Mobile number already registered" });
        }
        const otpCode = (0, otp_service_1.generateOtp)();
        const otpHash = (0, otp_service_1.hashOtp)(otpCode);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
        await (0, otp_service_1.handleMobileOtpCooldown)(mobileNumber, otpHash, expiresAt);
        console.log("\n========================================");
        console.log(`[SMS MOCK] OTP for mobile number ${mobileNumber} is: ${otpCode}`);
        console.log("========================================\n");
        res.json({ message: "OTP sent successfully. Please check the backend console log for code." });
    }
    catch (error) {
        res.status(400).json({ message: error.message || "Failed to send OTP" });
    }
};
exports.sendOtp = sendOtp;
// Register controller with OTP validation
const register = async (req, res) => {
    const { name, email, password, mobileNumber, otp } = req.body;
    try {
        const isValid = await (0, otp_service_1.verifyMobileOtp)(mobileNumber, otp);
        if (!isValid) {
            return res.status(400).json({ message: "Invalid OTP code" });
        }
        const result = await (0, auth_service_1.registerUser)(name, email, password, mobileNumber);
        await prisma_1.default.otpVerification.delete({ where: { mobileNumber } }).catch(() => { });
        await (0, auditLogger_1.logAuditAction)(req, "Candidate Registered", result.user.id, {
            userId: result.user.id,
            userName: result.user.email,
        });
        const token = jsonwebtoken_1.default.sign({ userId: result.user.id, email: result.user.email, role: result.user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
        const ipAddress = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers["user-agent"];
        await prisma_1.default.session.create({
            data: { userId: result.user.id, token, ipAddress, userAgent },
        });
        res.json({ message: "Registration successful", token, user: result.user });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.register = register;
// Login controller
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await (0, auth_service_1.loginUser)(email, password);
        await (0, auditLogger_1.logAuditAction)(req, "Login", result.user.id, {
            userId: result.user.id,
            userName: result.user.email,
        });
        const ipAddress = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers["user-agent"];
        await prisma_1.default.session.create({
            data: { userId: result.user.id, token: result.token, ipAddress, userAgent },
        });
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.login = login;
const logout = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(" ")[1];
            await prisma_1.default.session.deleteMany({ where: { token } });
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
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({
            user: {
                id: user.id, name: user.name, email: user.email,
                mobileNumber: user.mobileNumber, profilePhoto: user.profilePhoto,
                role: user.role, lastLogin: user.lastLogin,
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
        const updated = await prisma_1.default.user.update({
            where: { id: userId },
            data: { name: name.trim() },
        });
        await (0, auditLogger_1.logAuditAction)(req, "Profile Details Updated", userId);
        res.json({
            message: "Profile updated successfully",
            user: {
                id: updated.id, name: updated.name, email: updated.email,
                mobileNumber: updated.mobileNumber, profilePhoto: updated.profilePhoto,
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
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const isMatch = await bcrypt_1.default.compare(oldPassword, user.password);
        if (!isMatch)
            return res.status(400).json({ message: "Incorrect current password" });
        const hashed = await bcrypt_1.default.hash(newPassword, 10);
        await prisma_1.default.user.update({ where: { id: userId }, data: { password: hashed } });
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
        if (!req.file)
            return res.status(400).json({ message: "No file uploaded" });
        const fileName = `${Date.now()}-avatar-${req.file.originalname.replace(/\s+/g, "_")}`;
        const uploadsDir = path_1.default.join(__dirname, "../../uploads");
        if (!fs_1.default.existsSync(uploadsDir))
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        const filePath = path_1.default.join(uploadsDir, fileName);
        fs_1.default.writeFileSync(filePath, req.file.buffer);
        const profilePhotoUrl = `${req.protocol}://${req.get("host")}/uploads/${fileName}`;
        await prisma_1.default.user.update({ where: { id: userId }, data: { profilePhoto: profilePhotoUrl } });
        await (0, auditLogger_1.logAuditAction)(req, "Profile Photo Updated", userId);
        res.json({ message: "Profile photo updated successfully", profilePhoto: profilePhotoUrl });
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
        const existing = await prisma_1.default.user.findUnique({ where: { mobileNumber: newMobileNumber } });
        if (existing)
            return res.status(400).json({ message: "Mobile number is already in use by another account" });
        const otpCode = (0, otp_service_1.generateOtp)();
        const otpHash = (0, otp_service_1.hashOtp)(otpCode);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await (0, otp_service_1.handleMobileOtpCooldown)(newMobileNumber, otpHash, expiresAt);
        console.log("\n========================================");
        console.log(`[SMS MOCK] Change Mobile OTP for ${newMobileNumber} is: ${otpCode}`);
        console.log("========================================\n");
        res.json({ message: "OTP sent. Check console logs for code." });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.requestMobileChange = requestMobileChange;
// Verify Mobile Change
const verifyMobileChange = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { newMobileNumber, otp } = req.body;
        const isValid = await (0, otp_service_1.verifyMobileOtp)(newMobileNumber, otp);
        if (!isValid)
            return res.status(400).json({ message: "Invalid OTP code" });
        await (0, auth_service_1.changeMobile)(userId, newMobileNumber);
        await (0, auditLogger_1.logAuditAction)(req, "Mobile Number Changed", userId);
        res.json({ message: "Mobile number updated successfully" });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.verifyMobileChange = verifyMobileChange;
// Request Email Change (OTP verification)
const requestEmailChange = async (req, res) => {
    try {
        const { newEmail } = req.body;
        const existing = await prisma_1.default.user.findUnique({ where: { email: newEmail } });
        if (existing)
            return res.status(400).json({ message: "Email is already registered to another account" });
        const otpCode = (0, otp_service_1.generateOtp)();
        const otpHash = (0, otp_service_1.hashOtp)(otpCode);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await (0, otp_service_1.handleEmailOtpCooldown)(newEmail, otpHash, expiresAt);
        console.log("\n========================================");
        console.log(`[EMAIL MOCK] Change Email OTP for ${newEmail} is: ${otpCode}`);
        console.log("========================================\n");
        res.json({ message: "OTP sent. Check console logs for code." });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.requestEmailChange = requestEmailChange;
// Verify Email Change
const verifyEmailChange = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { newEmail, otp } = req.body;
        const isValid = await (0, otp_service_1.verifyEmailOtp)(newEmail, otp);
        if (!isValid)
            return res.status(400).json({ message: "Invalid OTP code" });
        await (0, auth_service_1.changeEmail)(userId, newEmail);
        await (0, auditLogger_1.logAuditAction)(req, "Email Changed", userId);
        res.json({ message: "Email updated successfully" });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
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
            id: s.id, ipAddress: s.ipAddress || "Unknown", userAgent: s.userAgent || "Unknown",
            isCurrent: s.token === currentToken, createdAt: s.createdAt,
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
        const session = await prisma_1.default.session.findFirst({ where: { id, userId } });
        if (!session)
            return res.status(404).json({ message: "Session not found" });
        await prisma_1.default.session.delete({ where: { id } });
        await (0, auditLogger_1.logAuditAction)(req, "Session Revoked", id);
        res.json({ message: "Session terminated successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.revokeSession = revokeSession;
