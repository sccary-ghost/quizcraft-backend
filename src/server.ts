
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

import { logger, stream } from "./utils/logger";
import { requestId } from "./middleware/requestId.middleware";
import { generalLimiter } from "./middleware/rateLimit.middleware";
import { errorHandler } from "./middleware/errorHandler.middleware";
import { authenticate, authorizeAdmin } from "./middleware/auth.middleware";

import quizRoutes from "./routes/quiz.routes";
import authRoutes from "./routes/auth.routes";
import questionsRoutes from "./routes/questions.routes";
import userRoutes from "./routes/user.routes";
import auditRoutes from "./routes/audit.routes";
import folderRoutes from "./routes/folder.routes";
import mediaRoutes from "./routes/media.routes";
import bookmarkRoutes from "./routes/bookmark.routes";
import practiceRoutes from "./routes/practice.routes";
import resumeRoutes from "./routes/resume.routes";
import translationRoutes from "./routes/translation.routes";
import aiRoutes from "./routes/ai.routes";
import proctoringRoutes from "./routes/proctoring.routes";
import notificationRoutes from "./routes/notification.routes";
import settingsRoutes from "./routes/settings.routes";
import prisma from "./utils/prisma";

dotenv.config();

const app = express();

// 1. UUID injection
app.use(requestId);

// 2. Security Headers
app.use(helmet());
app.use(helmet.crossOriginOpenerPolicy({ policy: "same-origin" }));
app.use(helmet.crossOriginEmbedderPolicy({ policy: "require-corp" }));
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

// 3. CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(",") 
  : ["http://localhost:3000"];
app.use(cors({ origin: allowedOrigins, credentials: true }));

// 4. Compression
app.use(compression());

// 5. Logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev", { stream }));

// 6. Body parsing
app.use(express.json({ limit: "2mb" }));

// 7. General Rate Limiter
app.use(generalLimiter);

// 8. Health, Ready, Live, Metrics
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});
app.get("/ready", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready", db: "ok" });
  } catch {
    res.status(503).json({ status: "not ready", db: "error" });
  }
});
app.get("/live", (req, res) => {
  res.json({ status: "alive" });
});
app.get("/metrics", authenticate, authorizeAdmin, (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    timestamp: new Date().toISOString(),
  });
});

// Ensure uploads folder exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// 9. Routes
app.use("/auth", authRoutes);
app.use("/quiz", quizRoutes);
app.use("/questions", questionsRoutes);
app.use("/users", userRoutes);
app.use("/audit", auditRoutes);
app.use("/folders", folderRoutes);
app.use("/media", mediaRoutes);
app.use("/bookmarks", bookmarkRoutes);
app.use("/practice", practiceRoutes);
app.use("/session", resumeRoutes);
app.use("/translations", translationRoutes);
app.use("/ai", aiRoutes);
app.use("/proctoring", proctoringRoutes);
app.use("/notifications", notificationRoutes);
app.use("/settings", settingsRoutes);

app.get("/", (req, res) => {
  res.send("QuizCraft Backend Running 🚀");
});

// 10. 404 Catch-all
app.use((req, res, _next) => {
  res.status(404).json({ message: "Not Found" });
});

// 11. Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
