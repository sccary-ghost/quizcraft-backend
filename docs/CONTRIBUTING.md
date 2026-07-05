# Contributing to QuizCraft

Thank you for your interest in contributing to QuizCraft Phase 20! This document outlines our development workflows and standards.

## 1. Local Setup
1. **Prerequisites:** Node.js v20+, Docker Desktop.
2. **Clone:** `git clone https://github.com/quizcraft/QuizCraft-Backend.git`
3. **Install Dependencies:** `npm install`
4. **Environment:** Copy `.env.example` to `.env` and fill in necessary values.
5. **Start Infrastructure:** `docker-compose up -d` (Starts Postgres & Redis).
6. **Database Setup:** `npx prisma migrate dev` and `npx prisma db seed`.
7. **Run Server:** `npm run dev`

## 2. Branching Strategy
We follow a simplified GitFlow model:
- `main`: Stable, production-ready code.
- `develop`: Integration branch for upcoming releases.
- Feature branches: `feature/short-description` (branched from `develop`).
- Bugfix branches: `bugfix/issue-description` (branched from `develop`).

## 3. Commit Convention
We enforce Conventional Commits. Use the following prefixes:
- `feat:` A new feature.
- `fix:` A bug fix.
- `docs:` Documentation only changes.
- `style:` Formatting, missing semi-colons, etc.
- `refactor:` Code change that neither fixes a bug nor adds a feature.
- `test:` Adding or updating tests.
- `chore:` Changes to the build process or auxiliary tools.

Example: `feat(quiz): add AI-generated hints endpoint`

## 4. Coding Standards
- **TypeScript:** Strict mode is enforced. Use explicit types for function returns and parameters. Avoid `any`.
- **Linting:** We use ESLint and Prettier. Run `npm run lint` before committing.
- **Architecture:** Keep controllers lean. Place business logic inside the `services/` directory.

## 5. Pull Request Process
1. Push your branch to GitHub.
2. Open a PR against the `develop` branch.
3. Ensure CI passes (Linting, Tests, Build).
4. Request a review from at least one core maintainer.
5. Address review feedback. Once approved, squash and merge.
