"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalLimiter = exports.backupLimiter = exports.uploadLimiter = exports.aiLimiter = exports.otpLimiter = exports.authLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Limiters return a standard 429 JSON response with Retry-After header automatically
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { message: "Too many login/register attempts from this IP, please try again after 15 minutes." },
});
exports.otpLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5,
    message: { message: "Too many OTP requests from this IP, please try again after 10 minutes." },
});
exports.aiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20,
    message: { message: "Too many AI requests from this IP, please try again after a minute." },
});
exports.uploadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10,
    message: { message: "Too many file uploads from this IP, please try again after a minute." },
});
exports.backupLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: { message: "Too many backup requests from this IP, please try again after an hour." },
});
exports.generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100,
    message: { message: "Too many requests from this IP, please try again after a minute." },
});
