import { Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
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

    res.json(result);
  } catch (error: any) {
    res.status(400).json({
      message: error.message,
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    await logAuditAction(req, "Logout");
    res.json({ message: "Logout successful" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Get profile controller (me)
export const getMe = async (req: Request, res: Response) => {
  res.json({
    user: (req as any).user,
  });
};