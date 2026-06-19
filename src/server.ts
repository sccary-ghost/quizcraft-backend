import quizRoutes from "./routes/quiz.routes";
import authRoutes from "./routes/auth.routes";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/quiz", quizRoutes);

app.get("/", (req, res) => {
  res.send("QuizCraft Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});