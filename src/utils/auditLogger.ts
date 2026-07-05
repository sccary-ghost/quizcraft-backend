import { Request } from "express";
import prisma from "./prisma";

/**
 * Log a user or system action in the Audit Log history database.
 * Auto-extracts metadata from request headers.
 */
export const logAuditAction = async (
  req: Request | null,
  action: string,
  target?: string | null,
  fallbackUser?: { userId: string; userName: string }
) => {
  let userId: string | null = null;
  let userName = "System";
  let ipAddress: string | null = null;
  let userAgent: string | null = null;

  if (req) {
    // Read details from authenticate middleware
    if (req.user!) {
      userId = req.user!.userId || null;
      userName = req.user!.email || req.user!.name || "System";
    }

    // Read client IP address
    const xForwardedFor = req.headers["x-forwarded-for"];
    if (xForwardedFor) {
      ipAddress = typeof xForwardedFor === "string" ? xForwardedFor.split(",")[0].trim() : xForwardedFor[0].trim();
    } else {
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
    await prisma.auditLog.create({
      data: {
        action,
        target: target || null,
        userId,
        userName,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log entry:", err);
  }
};
