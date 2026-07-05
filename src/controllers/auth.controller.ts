import { Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import prisma from "../utils/prisma";
import {
  registerUser,
  loginUser,
} from "../services/auth.service";
import { logAuditAction } from "../utils/auditLogger";

// Helper to hash OTP safely
const hashOtp = (otp: string): string => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

// Send OTP controller
export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { mobileNumber } = req.body;

    // Validate mobile number format
    if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
      return res.status(400).json({
        message: "Mobile number must be exactly 10 digits and numeric only",
      });
    }

    // Check if mobile number is already registered in User table
    const existingUser = await prisma.user.findUnique({
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

    const existingVerification = await prisma.otpVerification.findUnique({
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
          await prisma.otpVerification.update({
            where: { mobileNumber },
            data: {
              otpHash,
              expiresAt,
              attempts: 0,
              resendCount: 1,
              lastRequestedAt: new Date(),
            },
          });
        } else {
          return res.status(429).json({
            message: "Maximum OTP resend attempts exceeded. Please try again after 5 minutes.",
          });
        }
      } else {
        await prisma.otpVerification.update({
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
    } else {
      await prisma.otpVerification.create({
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
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Failed to send OTP",
    });
  }
};

// Register controller with OTP validation
export const register = async (req: Request, res: Response) => {
  const { name, email, password, mobileNumber, otp } = req.body;

  try {
    if (!otp) {
      return res.status(400).json({ message: "OTP is mandatory for registration" });
    }
    if (!mobileNumber) {
      return res.status(400).json({ message: "Mobile number is mandatory" });
    }

    // Retrieve verification record
    const verification = await prisma.otpVerification.findUnique({
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
      await prisma.otpVerification.delete({ where: { mobileNumber } });
      return res.status(429).json({ message: "Too many failed attempts. Please request a new OTP." });
    }

    // Match OTP
    const incomingHash = hashOtp(otp);
    if (verification.otpHash !== incomingHash) {
      await prisma.otpVerification.update({
        where: { mobileNumber },
        data: { attempts: verification.attempts + 1 },
      });
      return res.status(400).json({ message: "Invalid OTP code" });
    }

    // Create user in database
    const result = await registerUser(name, email, password, mobileNumber);

    // Clean up verification
    await prisma.otpVerification.delete({ where: { mobileNumber } });

    // Log registration action
    await logAuditAction(req, "Candidate Registered", result.user.id, {
      userId: result.user.id,
      userName: result.user.email,
    });

    // Auto-login upon registration
    const token = jwt.sign(
      {
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "7d",
      }
    );

    // Record Active Session
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];
    await prisma.session.create({
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
  } catch (error: any) {
    res.status(400).json({
      message: error.message,
    });
  }
};

// Login controller
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const result = await loginUser(email, password);

    // Log login action
    await logAuditAction(req, "Login", result.user.id, {
      userId: result.user.id,
      userName: result.user.email,
    });

    // Record Active Session
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];
    await prisma.session.create({
      data: {
        userId: result.user.id,
        token: result.token,
        ipAddress,
        userAgent,
      },
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({
      message: error.message,
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      // Revoke this session from database
      await prisma.session.deleteMany({
        where: { token },
      });
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
    const user = await prisma.user.findUnique({
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Update personal details (Name only)
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Name is required" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
    });

    await logAuditAction(req, "Profile Details Updated", userId);

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
  } catch (error: any) {
    res.status(550).json({ message: error.message });
  }
};

// Change Password
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Old password and new password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

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
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileName = `${Date.now()}-avatar-${req.file.originalname.replace(/\s+/g, "_")}`;
    const uploadsDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, req.file.buffer);

    const profilePhotoUrl = `${req.protocol}://${req.get("host")}/uploads/${fileName}`;

    await prisma.user.update({
      where: { id: userId },
      data: { profilePhoto: profilePhotoUrl },
    });

    await logAuditAction(req, "Profile Photo Updated", userId);

    res.json({
      message: "Profile photo updated successfully",
      profilePhoto: profilePhotoUrl,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Request Mobile Change (OTP verification)
export const requestMobileChange = async (req: Request, res: Response) => {
  try {
    const { newMobileNumber } = req.body;

    if (!newMobileNumber || !/^\d{10}$/.test(newMobileNumber)) {
      return res.status(400).json({ message: "New mobile number must be exactly 10 digits" });
    }

    const existing = await prisma.user.findUnique({
      where: { mobileNumber: newMobileNumber },
    });

    if (existing) {
      return res.status(400).json({ message: "Mobile number is already in use by another account" });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashOtp(otpCode);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.otpVerification.upsert({
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Verify Mobile Change
export const verifyMobileChange = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { newMobileNumber, otp } = req.body;

    if (!newMobileNumber || !otp) {
      return res.status(400).json({ message: "newMobileNumber and otp are required" });
    }

    const verification = await prisma.otpVerification.findUnique({
      where: { mobileNumber: newMobileNumber },
    });

    if (!verification || new Date(verification.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP verification record not found or expired" });
    }

    const incomingHash = hashOtp(otp);
    if (verification.otpHash !== incomingHash) {
      await prisma.otpVerification.update({
        where: { mobileNumber: newMobileNumber },
        data: { attempts: verification.attempts + 1 },
      });
      return res.status(400).json({ message: "Invalid OTP code" });
    }

    // Update user phone
    await prisma.user.update({
      where: { id: userId },
      data: { mobileNumber: newMobileNumber },
    });

    await prisma.otpVerification.delete({
      where: { mobileNumber: newMobileNumber },
    });

    await logAuditAction(req, "Mobile Number Changed", userId);

    res.json({ message: "Mobile number updated successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Request Email Change (OTP verification)
export const requestEmailChange = async (req: Request, res: Response) => {
  try {
    const { newEmail } = req.body;

    if (!newEmail || !/^\S+@\S+\.\S+$/.test(newEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const existing = await prisma.user.findUnique({
      where: { email: newEmail },
    });

    if (existing) {
      return res.status(400).json({ message: "Email is already registered to another account" });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashOtp(otpCode);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.emailOtpVerification.upsert({
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Verify Email Change
export const verifyEmailChange = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { newEmail, otp } = req.body;

    if (!newEmail || !otp) {
      return res.status(400).json({ message: "newEmail and otp are required" });
    }

    const verification = await prisma.emailOtpVerification.findUnique({
      where: { email: newEmail },
    });

    if (!verification || new Date(verification.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP verification record not found or expired" });
    }

    const incomingHash = hashOtp(otp);
    if (verification.otpHash !== incomingHash) {
      await prisma.emailOtpVerification.update({
        where: { email: newEmail },
        data: { attempts: verification.attempts + 1 },
      });
      return res.status(400).json({ message: "Invalid OTP code" });
    }

    // Update user email
    await prisma.user.update({
      where: { id: userId },
      data: { email: newEmail },
    });

    await prisma.emailOtpVerification.delete({
      where: { email: newEmail },
    });

    await logAuditAction(req, "Email Changed", userId);

    res.json({ message: "Email updated successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
      id: s.id,
      ipAddress: s.ipAddress || "Unknown",
      userAgent: s.userAgent || "Unknown",
      isCurrent: s.token === currentToken,
      createdAt: s.createdAt,
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

    const session = await prisma.session.findFirst({
      where: { id, userId },
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    await prisma.session.delete({
      where: { id },
    });

    await logAuditAction(req, "Session Revoked", id);

    res.json({ message: "Session terminated successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
