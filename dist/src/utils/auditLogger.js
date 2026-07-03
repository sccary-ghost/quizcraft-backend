"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuditAction = void 0;
const prisma_1 = __importDefault(require("./prisma"));
/**
 * Log a user or system action in the Audit Log history database.
 * Auto-extracts metadata from request headers.
 */
const logAuditAction = async (req, action, target, fallbackUser) => {
    let userId = null;
    let userName = "System";
    let ipAddress = null;
    let userAgent = null;
    if (req) {
        // Read details from authenticate middleware
        if (req.user) {
            userId = req.user.userId || null;
            userName = req.user.email || req.user.name || "System";
        }
        // Read client IP address
        const xForwardedFor = req.headers["x-forwarded-for"];
        if (xForwardedFor) {
            ipAddress = typeof xForwardedFor === "string" ? xForwardedFor.split(",")[0].trim() : xForwardedFor[0].trim();
        }
        else {
            ipAddress = req.socket.remoteAddress || null;
        }
        // Read browser user-agent
        userAgent = req.headers["user-agent"] || null;
    }
    if (!userId && fallbackUser) {
        userId = fallbackUser.userId;
        userName = fallbackUser.userName;
    }
    try {
        await prisma_1.default.auditLog.create({
            data: {
                action,
                target: target || null,
                userId,
                userName,
                ipAddress,
                userAgent,
            },
        });
    }
    catch (err) {
        console.error("Failed to write audit log entry:", err);
    }
};
exports.logAuditAction = logAuditAction;
