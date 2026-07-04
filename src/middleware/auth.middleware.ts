import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    );

    (req as any).user = decoded;

    next();
  } catch {
    res.status(401).json({
      message: "Invalid token",
    });
  }
};

export const authorizeAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if ((req as any).user && (req as any).user.role === "ADMIN") {
    return next();
  }
  return res.status(403).json({
    message: "Forbidden: Admin access only",
  });
};

export const authorizeCandidate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if ((req as any).user && (req as any).user.role === "CANDIDATE") {
    return next();
  }
  return res.status(403).json({
    message: "Forbidden: Candidate access only",
  });
};