"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmailChangeSchema = exports.requestEmailChangeSchema = exports.verifyMobileChangeSchema = exports.requestMobileChangeSchema = exports.changePasswordSchema = exports.updateProfileSchema = exports.sendOtpSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, "Name must be at least 2 characters long"),
        email: zod_1.z.string().email("Invalid email format"),
        password: zod_1.z.string().min(6, "Password must be at least 6 characters long"),
        mobileNumber: zod_1.z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
        otp: zod_1.z.string().min(6).max(6, "OTP must be exactly 6 digits"),
    }),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email("Invalid email format"),
        password: zod_1.z.string().min(6, "Password is required"),
    }),
});
exports.sendOtpSchema = zod_1.z.object({
    body: zod_1.z.object({
        mobileNumber: zod_1.z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
    }),
});
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, "Name must be at least 2 characters long"),
    }),
});
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        oldPassword: zod_1.z.string().min(6, "Old password is required"),
        newPassword: zod_1.z.string().min(6, "New password must be at least 6 characters long"),
    }),
});
exports.requestMobileChangeSchema = zod_1.z.object({
    body: zod_1.z.object({
        newMobileNumber: zod_1.z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
    }),
});
exports.verifyMobileChangeSchema = zod_1.z.object({
    body: zod_1.z.object({
        newMobileNumber: zod_1.z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
        otp: zod_1.z.string().min(6).max(6, "OTP must be exactly 6 digits"),
    }),
});
exports.requestEmailChangeSchema = zod_1.z.object({
    body: zod_1.z.object({
        newEmail: zod_1.z.string().email("Invalid email format"),
    }),
});
exports.verifyEmailChangeSchema = zod_1.z.object({
    body: zod_1.z.object({
        newEmail: zod_1.z.string().email("Invalid email format"),
        otp: zod_1.z.string().min(6).max(6, "OTP must be exactly 6 digits"),
    }),
});
