import quizRoutes from "./routes/quiz.routes";
import authRoutes from "./routes/auth.routes";
import questionsRoutes from "./routes/questions.routes";
import userRoutes from "./routes/user.routes";
import auditRoutes from "./routes/audit.routes";
import folderRoutes from "./routes/folder.routes";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Ensure uploads folder exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/auth", authRoutes);
app.use("/quiz", quizRoutes);
app.use("/questions", questionsRoutes);
app.use("/users", userRoutes);
app.use("/audit", auditRoutes);
app.use("/folders", folderRoutes);

app.get("/", (req, res) => {
  res.send("QuizCraft Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});