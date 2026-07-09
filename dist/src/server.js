"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("./utils/logger");
const requestId_middleware_1 = require("./middleware/requestId.middleware");
const rateLimit_middleware_1 = require("./middleware/rateLimit.middleware");
const errorHandler_middleware_1 = require("./middleware/errorHandler.middleware");
const auth_middleware_1 = require("./middleware/auth.middleware");
const quiz_routes_1 = __importDefault(require("./routes/quiz.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const questions_routes_1 = __importDefault(require("./routes/questions.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const audit_routes_1 = __importDefault(require("./routes/audit.routes"));
const folder_routes_1 = __importDefault(require("./routes/folder.routes"));
const media_routes_1 = __importDefault(require("./routes/media.routes"));
const bookmark_routes_1 = __importDefault(require("./routes/bookmark.routes"));
const practice_routes_1 = __importDefault(require("./routes/practice.routes"));
const resume_routes_1 = __importDefault(require("./routes/resume.routes"));
const translation_routes_1 = __importDefault(require("./routes/translation.routes"));
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
const proctoring_routes_1 = __importDefault(require("./routes/proctoring.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const settings_routes_1 = __importDefault(require("./routes/settings.routes"));
const study_routes_1 = __importDefault(require("./routes/study.routes"));
const aiReading_routes_1 = __importDefault(require("./routes/aiReading.routes"));
const reading_routes_1 = __importDefault(require("./routes/reading.routes"));
const vocabulary_routes_1 = __importDefault(require("./routes/vocabulary.routes"));
const prisma_1 = __importDefault(require("./utils/prisma"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// 1. UUID injection
app.use(requestId_middleware_1.requestId);
// 2. Security Headers
app.use((0, helmet_1.default)());
app.use(helmet_1.default.crossOriginOpenerPolicy({ policy: "same-origin" }));
app.use(helmet_1.default.crossOriginEmbedderPolicy({ policy: "require-corp" }));
app.use(helmet_1.default.crossOriginResourcePolicy({ policy: "cross-origin" }));
// 3. CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : ["http://localhost:3000"];
app.use((0, cors_1.default)({ origin: allowedOrigins, credentials: true }));
// 4. Compression
app.use((0, compression_1.default)());
// 5. Logging
app.use((0, morgan_1.default)(process.env.NODE_ENV === "production" ? "combined" : "dev", { stream: logger_1.stream }));
// 6. Body parsing
app.use(express_1.default.json({ limit: "2mb" }));
// 7. General Rate Limiter
app.use(rateLimit_middleware_1.generalLimiter);
// 8. Health, Ready, Live, Metrics
app.get("/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});
app.get("/ready", async (req, res) => {
    try {
        await prisma_1.default.$queryRaw `SELECT 1`;
        res.json({ status: "ready", db: "ok" });
    }
    catch {
        res.status(503).json({ status: "not ready", db: "error" });
    }
});
app.get("/live", (req, res) => {
    res.json({ status: "alive" });
});
app.get("/metrics", auth_middleware_1.authenticate, auth_middleware_1.authorizeAdmin, (req, res) => {
    res.json({
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        timestamp: new Date().toISOString(),
    });
});
// Ensure uploads folder exists
if (!fs_1.default.existsSync("uploads")) {
    fs_1.default.mkdirSync("uploads");
}
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
// 9. Routes
app.use("/auth", auth_routes_1.default);
app.use("/quiz", quiz_routes_1.default);
app.use("/questions", questions_routes_1.default);
app.use("/users", user_routes_1.default);
app.use("/audit", audit_routes_1.default);
app.use("/folders", folder_routes_1.default);
app.use("/media", media_routes_1.default);
app.use("/bookmarks", bookmark_routes_1.default);
app.use("/practice", practice_routes_1.default);
app.use("/session", resume_routes_1.default);
app.use("/translations", translation_routes_1.default);
app.use("/ai", ai_routes_1.default);
app.use("/proctoring", proctoring_routes_1.default);
app.use("/notifications", notification_routes_1.default);
app.use("/settings", settings_routes_1.default);
app.use("/study", study_routes_1.default);
app.use("/ai-reading", aiReading_routes_1.default);
app.use("/reading", reading_routes_1.default);
app.use("/vocabulary", vocabulary_routes_1.default);
app.get("/", (req, res) => {
    res.send("QuizCraft Backend Running 🚀");
});
// 10. 404 Catch-all
app.use((req, res, _next) => {
    res.status(404).json({ message: "Not Found" });
});
// 11. Error Handler
app.use(errorHandler_middleware_1.errorHandler);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    logger_1.logger.info(`Server running on port ${PORT}`);
});
