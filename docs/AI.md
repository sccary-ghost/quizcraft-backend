# QuizCraft AI Integration

Phase 20 of QuizCraft introduces powerful LLM-driven features to automate content creation and assessment. This document details the AI architecture.

## 1. Supported Providers
- **Primary:** OpenAI (GPT-4o) via the official Node.js SDK.
- **Fallback:** Anthropic (Claude 3.5 Sonnet) / Google Gemini used as failovers if OpenAI experiences downtime or rate limits.

## 2. Core AI Features

### A. Automated Quiz Generation
Instructors can upload text, PDFs, or specify a topic. The AI generates a structured quiz payload in JSON.
- **Endpoint:** `POST /api/v1/ai/generate-quiz`
- **Mechanism:** Uses strictly typed function calling (OpenAI Structured Outputs or JSON mode) to guarantee the model returns questions, options, and correctness flags matching the Prisma schema format.

### B. Subjective Answer Evaluation
For Short Answer or Essay questions, the AI acts as an automatic grader.
- **Endpoint:** `POST /api/v1/ai/evaluate`
- **Input:** Student's answer, correct rubric/reference answer, and question context.
- **Output:** A numeric score (0-100) and constructive feedback explaining where the student lost points.

### C. Personalized Learning Paths
Analyzes a student's past attempt histories to identify weak areas and recommend specific topics or automatically generate targeted practice quizzes.

## 3. Prompt Management
Prompts are stored as templates in `src/ai/prompts/`. They use a lightweight templating system to inject variables (e.g., `{{topic}}`, `{{difficulty}}`, `{{rubric}}`). This keeps business logic out of prompt text and allows for easy iteration.

## 4. Cost and Rate Limit Management
- **Caching:** Identical AI requests (e.g., generating a quiz for "Photosynthesis High School Level") are cached in Redis for 24 hours to save API costs.
- **Rate Limiting:** Users are heavily rate-limited on AI endpoints to prevent abuse.
- **Asynchronous Processing:** Long-running AI generation tasks are offloaded to a BullMQ worker to prevent Express request timeouts. Clients receive a Job ID and can poll or wait for a WebSocket event upon completion.
