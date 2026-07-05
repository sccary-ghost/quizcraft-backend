"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Ensure uploads folder exists
if (!fs_1.default.existsSync("uploads")) {
    fs_1.default.mkdirSync("uploads");
}
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
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
app.get("/", (req, res) => {
    res.send("QuizCraft Backend Running 🚀");
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
