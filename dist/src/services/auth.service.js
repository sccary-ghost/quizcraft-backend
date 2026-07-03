"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.registerUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const emailBlacklist_1 = require("../utils/emailBlacklist");
const registerUser = async (name, email, password, mobileNumber) => {
    // 1. Validate name
    if (!name || name.trim().length < 2) {
        throw new Error("Name must be at least 2 characters long");
    }
    // 2. Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Invalid email format");
    }
    // 3. Reject disposable emails
    if ((0, emailBlacklist_1.isDisposableEmail)(email)) {
        throw new Error("Registration from temporary/disposable email providers is not allowed");
    }
    // 4. Validate mobile number (exactly 10 digits)
    if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
        throw new Error("Mobile number must be exactly 10 digits and numeric only");
    }
    // 5. Unique checks
    const existingEmail = await prisma_1.default.user.findUnique({
        where: { email },
    });
    if (existingEmail) {
        throw new Error("Email already registered");
    }
    const existingMobile = await prisma_1.default.user.findUnique({
        where: { mobileNumber },
    });
    if (existingMobile) {
        throw new Error("Mobile number already registered");
    }
    // 6. Password check
    if (!password || password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
    }
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    const user = await prisma_1.default.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            mobileNumber,
            isActive: true,
        },
    });
    return {
        message: "User created successfully",
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            mobileNumber: user.mobileNumber,
            isActive: user.isActive,
            createdAt: user.createdAt,
        },
    };
};
exports.registerUser = registerUser;
const loginUser = async (email, password) => {
    const user = await prisma_1.default.user.findUnique({
        where: {
            email,
        },
    });
    if (!user) {
        throw new Error("Invalid credentials");
    }
    // Reject login for deactivated candidates
    if (user.isActive === false) {
        throw new Error("Your account has been deactivated. Please contact administration.");
    }
    const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        throw new Error("Invalid credentials");
    }
    const token = jsonwebtoken_1.default.sign({
        userId: user.id,
        email: user.email,
    }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });
    return {
        message: "Login successful",
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            mobileNumber: user.mobileNumber,
            isActive: user.isActive,
        },
    };
};
exports.loginUser = loginUser;
