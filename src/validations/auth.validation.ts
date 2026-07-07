import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters long"),
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    mobileNumber: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
    otp: z.string().min(6).max(6, "OTP must be exactly 6 digits"),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password is required"),
  }),
});

export const sendOtpSchema = z.object({
  body: z.object({
    mobileNumber: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters long"),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(6, "Old password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters long"),
  }),
});

export const requestMobileChangeSchema = z.object({
  body: z.object({
    newMobileNumber: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
  }),
});

export const verifyMobileChangeSchema = z.object({
  body: z.object({
    newMobileNumber: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
    otp: z.string().min(6).max(6, "OTP must be exactly 6 digits"),
  }),
});

export const requestEmailChangeSchema = z.object({
  body: z.object({
    newEmail: z.string().email("Invalid email format"),
  }),
});

export const verifyEmailChangeSchema = z.object({
  body: z.object({
    newEmail: z.string().email("Invalid email format"),
    otp: z.string().min(6).max(6, "OTP must be exactly 6 digits"),
  }),
});
