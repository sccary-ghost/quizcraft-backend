import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import prisma from "../utils/prisma";
import {
  registerUser,
  loginUser,
  changeMobile,
  changeEmail,
} from "../services/auth.service";
import { logAuditAction } from "../utils/auditLogger";
import {
  hashOtp,
  generateOtp,
  handleMobileOtpCooldown,
  handleEmailOtpCooldown,
  verifyMobileOtp,
  verifyEmailOtp,
} from "../services/otp.service";

// Send OTP controller
export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { mobileNumber } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { mobileNumber },
    });
    if (existingUser) {
      return res.status(400).json({ message: "Mobile number already registered" });
    }

    const otpCode = generateOtp();
    const otpHash = hashOtp(otpCode);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    await handleMobileOtpCooldown(mobileNumber, otpHash, expiresAt);

    console.log("\n========================================");
    console.log(`[SMS MOCK] OTP for mobile number ${mobileNumber} is: ${otpCode}`);
    console.log("========================================\n");

    res.json({ message: "OTP sent successfully. Please check the backend console log for code." });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to send OTP" });
  }
};

// Register controller with OTP validation
export const register = async (req: Request, res: Response) => {
  const { name, email, password, mobileNumber, otp } = req.body;

  try {
    const isValid = await verifyMobileOtp(mobileNumber, otp);
    if (!isValid) {
      return res.status(400).json({ message: "Invalid OTP code" });
    }

    const result = await registerUser(name, email, password, mobileNumber);

    await prisma.otpVerification.delete({ where: { mobileNumber } }).catch(() => {});

    await logAuditAction(req, "Candidate Registered", result.user.id, {
      userId: result.user.id,
      userName: result.user.email,
    });

    const token = jwt.sign(
      { userId: result.user.id, email: result.user.email, role: result.user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];
    await prisma.session.create({
      data: { userId: result.user.id, token, ipAddress, userAgent },
    });

    res.json({ message: "Registration successful", token, user: result.user });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Login controller
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password);

    if (result.user.role === "ADMIN") {
      return res.status(403).json({ message: "Admin users must login through the admin portal" });
    }

    await logAuditAction(req, "Login", result.user.id, {
      userId: result.user.id,
      userName: result.user.email,
    });

    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];
    await prisma.session.create({
      data: { userId: result.user.id, token: result.token, ipAddress, userAgent },
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Admin Login controller
export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password);

    if (result.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    await logAuditAction(req, "Admin Login", result.user.id, {
      userId: result.user.id,
      userName: result.user.email,
    });

    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];
    await prisma.session.create({
      data: { userId: result.user.id, token: result.token, ipAddress, userAgent },
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      await prisma.session.deleteMany({ where: { token } });
    }

    await logAuditAction(req, "Logout");
    res.json({ message: "Logout successful" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Get profile controller (me)
export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Update personal details (Name only)
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name } = req.body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
    });

    await logAuditAction(req, "Profile Details Updated", userId);

    res.json({
      message: "Profile updated successfully",
      user: {
        id: updated.id, name: updated.name, email: updated.email,
        mobileNumber: updated.mobileNumber, profilePhoto: updated.profilePhoto,
        role: updated.role,
      },
    });
  } catch (error: any) {
    res.status(550).json({ message: error.message });
  }
};

// Change Password
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { oldPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Incorrect current password" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    await logAuditAction(req, "Password Changed", userId);
    res.json({ message: "Password updated successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Upload Profile Photo
export const uploadProfilePhoto = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const fileName = `${Date.now()}-avatar-${req.file.originalname.replace(/\s+/g, "_")}`;
    const uploadsDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, req.file.buffer);

    const profilePhotoUrl = `${req.protocol}://${req.get("host")}/uploads/${fileName}`;
    await prisma.user.update({ where: { id: userId }, data: { profilePhoto: profilePhotoUrl } });

    await logAuditAction(req, "Profile Photo Updated", userId);
    res.json({ message: "Profile photo updated successfully", profilePhoto: profilePhotoUrl });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Request Mobile Change (OTP verification)
export const requestMobileChange = async (req: Request, res: Response) => {
  try {
    const { newMobileNumber } = req.body;

    const existing = await prisma.user.findUnique({ where: { mobileNumber: newMobileNumber } });
    if (existing) return res.status(400).json({ message: "Mobile number is already in use by another account" });

    const otpCode = generateOtp();
    const otpHash = hashOtp(otpCode);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await handleMobileOtpCooldown(newMobileNumber, otpHash, expiresAt);

    console.log("\n========================================");
    console.log(`[SMS MOCK] Change Mobile OTP for ${newMobileNumber} is: ${otpCode}`);
    console.log("========================================\n");

    res.json({ message: "OTP sent. Check console logs for code." });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Verify Mobile Change
export const verifyMobileChange = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { newMobileNumber, otp } = req.body;

    const isValid = await verifyMobileOtp(newMobileNumber, otp);
    if (!isValid) return res.status(400).json({ message: "Invalid OTP code" });

    await changeMobile(userId, newMobileNumber);

    await logAuditAction(req, "Mobile Number Changed", userId);
    res.json({ message: "Mobile number updated successfully" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Request Email Change (OTP verification)
export const requestEmailChange = async (req: Request, res: Response) => {
  try {
    const { newEmail } = req.body;

    const existing = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existing) return res.status(400).json({ message: "Email is already registered to another account" });

    const otpCode = generateOtp();
    const otpHash = hashOtp(otpCode);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await handleEmailOtpCooldown(newEmail, otpHash, expiresAt);

    console.log("\n========================================");
    console.log(`[EMAIL MOCK] Change Email OTP for ${newEmail} is: ${otpCode}`);
    console.log("========================================\n");

    res.json({ message: "OTP sent. Check console logs for code." });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Verify Email Change
export const verifyEmailChange = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { newEmail, otp } = req.body;

    const isValid = await verifyEmailOtp(newEmail, otp);
    if (!isValid) return res.status(400).json({ message: "Invalid OTP code" });

    await changeEmail(userId, newEmail);

    await logAuditAction(req, "Email Changed", userId);
    res.json({ message: "Email updated successfully" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Get Active Sessions list
export const getActiveSessions = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const currentToken = (req.headers.authorization?.split(" ")[1] || "") as string;

    const dbSessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const sessions = dbSessions.map((s) => ({
      id: s.id, ipAddress: s.ipAddress || "Unknown", userAgent: s.userAgent || "Unknown",
      isCurrent: s.token === currentToken, createdAt: s.createdAt,
    }));

    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Revoke/Terminating specific session
export const revokeSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const session = await prisma.session.findFirst({ where: { id, userId } });
    if (!session) return res.status(404).json({ message: "Session not found" });

    await prisma.session.delete({ where: { id } });
    await logAuditAction(req, "Session Revoked", id);
    res.json({ message: "Session terminated successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
