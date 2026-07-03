import { Router } from "express";
import prisma from "../utils/prisma";

const router = Router();

/**
 * GET /audit/logs
 * Retrieve all audit log entries, supporting query keyword searches and action filters.
 */
router.get("/logs", async (req, res) => {
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
