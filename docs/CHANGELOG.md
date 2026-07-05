# Changelog

All notable changes to the QuizCraft platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-05
### Added
- **AI Intelligence Suite**: Question generation, distractor generation, and OCR cleanup via OpenAI/Gemini/Claude integrations.
- **Proctoring Engine**: Tab monitoring, full-screen enforcement, copy-paste prevention, and AI webcam face detection.
- **Practice Center**: Personalized study recommendations and automated weak-area quizzes.
- **Question Versioning**: Complete history tracking and rollback for all question modifications.
- **Review Workflow**: Multi-stage (Draft, Review, Published) approval pipeline for tests and questions.
- **Notification Center**: In-app, Email, and SMS notification dispatch system.
- **Trash & Recovery**: Soft-delete implementation for questions, quizzes, and folders with a 30-day retention period.
- **Analytics Dashboard**: Comprehensive charts and difficulty prediction metrics for admins and candidates.
- **DevOps**: Complete Docker orchestration, CodeQL, Dependabot, and GitHub Actions CI pipelines.
- **Security**: Strict Helmet headers, Zod validation, Rate Limiting, and CORS policies.

### Changed
- Migrated Database schemas to use `@@index` for high-performance querying.
- Refactored frontend navigation to use `middleware.ts` for robust route protection.
- Upgraded testing infrastructure to Vitest (Frontend) and Jest (Backend) with 80% coverage targets.
- Optimized bulk editing to process updates in chunks, eliminating database connection exhaustion.
- Transitioned error handling to a global, centralized middleware stack.

### Fixed
- N+1 query performance bottlenecks in the Admin Dashboard statistics route.
- Redacted sensitive fields (passwords, tokens) from being written to Winston logs.
- Fixed unhandled promise rejections during concurrent AI request dispatch.
