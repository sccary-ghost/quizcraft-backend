"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stream = exports.logger = exports.redactSensitive = void 0;
const winston_1 = __importDefault(require("winston"));
const sensitiveKeys = ["password", "newPassword", "currentPassword", "token", "apiKey", "otp"];
const redactSensitive = (obj) => {
    if (typeof obj !== "object" || obj === null)
        return obj;
    if (Array.isArray(obj))
        return obj.map(exports.redactSensitive);
    const redacted = { ...obj };
    for (const key of Object.keys(redacted)) {
        if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
            redacted[key] = "[REDACTED]";
        }
        else if (typeof redacted[key] === "object") {
            redacted[key] = (0, exports.redactSensitive)(redacted[key]);
        }
    }
    return redacted;
};
exports.redactSensitive = redactSensitive;
const format = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format,
    transports: [
        new winston_1.default.transports.Console({
            format: process.env.NODE_ENV === "production" ? format : winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple()),
        }),
    ],
});
exports.stream = {
    write: (message) => {
        exports.logger.info(message.trim());
    },
};
