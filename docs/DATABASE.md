# QuizCraft Database Documentation

QuizCraft utilizes **PostgreSQL** managed via **Prisma ORM**. This document outlines the schema design, relationships, and performance considerations for Phase 20.

## Prisma Schema Overview

The database schema is defined in `prisma/schema.prisma`. It is strictly typed, and migrations are managed using `npx prisma migrate dev`.

### Core Entities

#### 1. `User`
Stores authentication credentials and profile information.
- Fields: `id` (UUID), `email` (Unique), `passwordHash`, `name`, `role` (Enum: STUDENT, INSTRUCTOR, ADMIN), `createdAt`, `updatedAt`.
- Relations: One-to-many with `Quiz` (as creator) and `Attempt`.

#### 2. `Quiz`
Represents a collection of questions.
- Fields: `id` (UUID), `title`, `description`, `isPublished`, `timeLimit` (int), `creatorId` (FK).
- Relations: Many-to-one with `User`, One-to-many with `Question`, One-to-many with `Attempt`.

#### 3. `Question`
A single question within a quiz.
- Fields: `id` (UUID), `quizId` (FK), `type` (Enum: MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER), `content`, `points`.
- Relations: Many-to-one with `Quiz`, One-to-many with `Option`.

#### 4. `Option`
Possible answers for Multiple Choice / True False questions.
- Fields: `id` (UUID), `questionId` (FK), `text`, `isCorrect` (Boolean).
- Relations: Many-to-one with `Question`.

#### 5. `Attempt`
A user's attempt at taking a quiz.
- Fields: `id` (UUID), `userId` (FK), `quizId` (FK), `score`, `startedAt`, `completedAt`.
- Relations: Many-to-one with `User` and `Quiz`, One-to-many with `AttemptAnswer`.

#### 6. `AttemptAnswer`
The specific answer provided by a user for a question during an attempt.
- Fields: `id`, `attemptId` (FK), `questionId` (FK), `selectedOptionId` (FK, Optional), `textAnswer` (String, Optional), `isCorrect` (Boolean).

## Indexes & Performance
To ensure fast lookups on large datasets, the following indexes are applied:
- `@@index([creatorId])` on `Quiz` for fast filtering by instructor.
- `@@index([userId, quizId])` on `Attempt` for quick retrieval of user history.
- `@@unique([email])` on `User`.

## Migrations Workflow
1. Modify `schema.prisma`.
2. Generate migration: `npx prisma migrate dev --name <description>`.
3. Generate client: `npx prisma generate`.
4. Production deploy: `npx prisma migrate deploy`.

## Data Seeding
For local development, `prisma/seed.ts` populates the database with admin users, sample quizzes, and mock attempts. Run it using:
`npx prisma db seed`
