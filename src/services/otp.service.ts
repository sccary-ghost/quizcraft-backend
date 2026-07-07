import crypto from "crypto";
import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";

export const hashOtp = (otp: string): string => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

export const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const handleMobileOtpCooldown = async (mobileNumber: string, otpHash: string, expiresAt: Date) => {
  const existingVerification = await prisma.otpVerification.findUnique({
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
        throw new Error("Maximum OTP resend attempts exceeded. Please try again after 5 minutes.");
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
};

export const handleEmailOtpCooldown = async (email: string, otpHash: string, expiresAt: Date) => {
  await prisma.$transaction(async (tx) => {
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
        } else {
          throw new Error("Maximum OTP resend attempts exceeded. Please try again after 5 minutes.");
        }
      } else {
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
    } else {
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
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
};

export const verifyMobileOtp = async (mobileNumber: string, incomingOtp: string): Promise<boolean> => {
  const verification = await prisma.otpVerification.findUnique({
    where: { mobileNumber },
  });

  if (!verification) {
    throw new Error("OTP verification not requested or expired");
  }

  if (new Date(verification.expiresAt).getTime() < Date.now()) {
    throw new Error("OTP has expired. Please request a new one.");
  }

  if (verification.attempts >= 5) {
    await prisma.otpVerification.delete({ where: { mobileNumber } });
    throw new Error("Too many failed attempts. Please request a new OTP.");
  }

  const incomingHash = hashOtp(incomingOtp);
  if (verification.otpHash !== incomingHash) {
    await prisma.otpVerification.update({
      where: { mobileNumber },
      data: { attempts: verification.attempts + 1 },
    });
    return false; // Invalid
  }

  return true; // Valid
};

export const verifyEmailOtp = async (email: string, incomingOtp: string): Promise<boolean> => {
  const verification = await prisma.emailOtpVerification.findUnique({
    where: { email },
  });

  if (!verification) {
    throw new Error("OTP verification not requested or expired");
  }

  if (new Date(verification.expiresAt).getTime() < Date.now()) {
    throw new Error("OTP has expired. Please request a new one.");
  }

  if (verification.attempts >= 5) {
    await prisma.emailOtpVerification.delete({ where: { email } });
    throw new Error("Too many failed attempts. Please request a new OTP.");
  }

  const incomingHash = hashOtp(incomingOtp);
  if (verification.otpHash !== incomingHash) {
    await prisma.emailOtpVerification.update({
      where: { email },
      data: { attempts: verification.attempts + 1 },
    });
    return false;
  }

  return true;
};
