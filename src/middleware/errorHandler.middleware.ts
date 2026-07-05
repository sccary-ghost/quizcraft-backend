import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  
  if (err instanceof ZodError) {
    return res.status(400).json({ errors: err.flatten() });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
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

  logger.error(err.message, {
    requestId: req.requestId,
    userId: req.user?.userId,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });

  return res.status(status).json({
    message: process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};
