"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("../utils/logger");
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const errorHandler = (err, req, res, _next) => {
    const status = err.status || 500;
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({ errors: err.flatten() });
    }
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
            return res.status(409).json({ message: "A record with that unique value already exists." });
        }
        if (err.code === "P2025") {
            return res.status(404).json({ message: "Record not found." });
        }
    }
    if (err.name === "UnauthorizedError" || err.message === "jwt expired" || err.message === "invalid token") {
        return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
    }
    logger_1.logger.error(err.message, {
        requestId: req.requestId,
        userId: req.user?.userId,
        stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    });
    return res.status(status).json({
        message: process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message,
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
};
exports.errorHandler = errorHandler;
