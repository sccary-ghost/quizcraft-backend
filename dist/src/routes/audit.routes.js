"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../utils/prisma"));
const router = (0, express_1.Router)();
/**
 * GET /audit/logs
 * Retrieve all audit log entries, supporting query keyword searches and action filters.
 */
router.get("/logs", async (req, res) => {
    try {
        const search = req.query.search || "";
        const action = req.query.action || "";
        const logs = await prisma_1.default.auditLog.findMany({
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
    }
    catch (error) {
        res.status(500).json({
            message: error.message || "Failed to retrieve audit logs logbook",
        });
    }
});
exports.default = router;
