import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthUser } from "../types/express";

// Fail fast on boot if secret is missing
if (!process.env.JWT_SECRET) {
  console.error("CRITICAL: JWT_SECRET environment variable is missing.");
  process.exit(1);
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided or invalid format" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string, { algorithms: ["HS256"] }) as AuthUser;
    
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    res.status(401).json({ message: "Invalid token" });
  }
};

export const authorizeAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === "ADMIN") {
    return next();
  }
  return res.status(403).json({ message: "Forbidden: Admin access only" });
};

export const authorizeCandidate = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === "CANDIDATE") {
    return next();
  }
  return res.status(403).json({ message: "Forbidden: Candidate access only" });
};

// IDOR Helper
export const assertOwnership = (reqUserId: string, resourceOwnerId: string) => {
  if (reqUserId !== resourceOwnerId) {
    throw { status: 403, message: "Forbidden: You do not own this resource" };
  }
};
