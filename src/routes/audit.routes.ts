import { Router } from "express";
import prisma from "../utils/prisma";
import { authenticate, authorizeAdmin } from "../middleware/auth.middleware";

const router = Router();

/**
 * GET /audit/logs
 * Retrieve all audit log entries. Protected for ADMIN only.
 */
router.get("/logs", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const search = (req.query.search as string) || "";
    const action = (req.query.action as string) || "";

    const logs = await prisma.auditLog.findMany({
      where: {
        AND: [
          action ? { action: { equals: action, mode: "insensitive" } } : {},
          search
            ? {
                OR: [
                  { userName: { contains: search, mode: "insensitive" } },
                  { action: { contains: search, mode: "insensitive" } },
                  { target: { contains: search, mode: "insensitive" } },
                  { ipAddress: { contains: search, mode: "insensitive" } },
                ],
              }
            : {},
        ],
      },
      orderBy: { timestamp: "desc" },
    });

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Failed to retrieve audit logs logbook",
    });
  }
});

export default router;
