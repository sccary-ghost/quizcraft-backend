# QuizCraft API Documentation

The QuizCraft RESTful API provides endpoints for authentication, user management, quiz creation, and taking attempts.

## Base URL
All API requests are prefixed with: `https://api.quizcraft.app/api/v1`

## Authentication
QuizCraft uses **JWT (JSON Web Tokens)**. Include the token in the Authorization header:
`Authorization: Bearer <your_jwt_token>`

## HTTP Status Codes
- `200 OK` - Request successful.
- `201 Created` - Resource successfully created.
- `400 Bad Request` - Validation failed or invalid payload.
- `401 Unauthorized` - Missing or invalid JWT.
- `403 Forbidden` - Insufficient permissions (e.g., Admin required).
- `404 Not Found` - Resource does not exist.
- `429 Too Many Requests` - Rate limit exceeded.
- `500 Internal Server Error` - Server-side issue.

---

## Core Endpoints

### 1. Authentication
- `POST /auth/register` - Register a new user.
- `POST /auth/login` - Authenticate and receive a JWT.
- `POST /auth/refresh` - Refresh an expired access token.
- `POST /auth/logout` - Invalidate the current session.

### 2. Users
- `GET /users/me` - Get current user profile.
- `PATCH /users/me` - Update profile information.
- `GET /users/:id` - Get a specific user (Admin).
- `DELETE /users/:id` - Delete user account.

### 3. Quizzes
- `GET /quizzes` - List available quizzes (supports `?page=1&limit=10&search=math`).
- `POST /quizzes` - Create a new quiz (requires Instructor/Admin role).
- `GET /quizzes/:id` - Get quiz details (including questions if authorized).
- `PUT /quizzes/:id` - Update a quiz.
- `DELETE /quizzes/:id` - Delete a quiz.

### 4. Questions
- `POST /quizzes/:quizId/questions` - Add a question to a quiz.
- `PUT /questions/:id` - Update a specific question.
- `DELETE /questions/:id` - Remove a question.

### 5. Attempts & Results
- `POST /quizzes/:quizId/attempts` - Start a new quiz attempt.
- `POST /attempts/:attemptId/submit` - Submit answers and complete the attempt.
- `GET /attempts/:attemptId` - Get the results of a specific attempt.
- `GET /users/me/attempts` - List all attempts by the current user.

### 6. AI Features
- `POST /ai/generate-quiz` - Generate a quiz from a provided topic or text block.
- `POST /ai/evaluate` - Evaluate a subjective answer and provide a score/feedback.

## Rate Limiting
- **Public endpoints:** 100 requests per 15 minutes.
- **Authenticated endpoints:** 1000 requests per 15 minutes.
- **AI endpoints:** 10 requests per minute per user.

## Pagination & Filtering
List endpoints support pagination:
- `page` (default 1)
- `limit` (default 20, max 100)
- `sort` (e.g., `createdAt:desc`)
