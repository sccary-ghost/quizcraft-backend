# QuizCraft CBT Platform

QuizCraft is an enterprise-grade Computer Based Test (CBT) Platform designed for robust, scalable, and secure examination delivery. It features AI-powered content generation, online proctoring, detailed analytics, and comprehensive administrative controls.

## Architecture

QuizCraft is split into two primary repositories:
- **Backend**: A Node.js / Express API utilizing Prisma ORM with PostgreSQL.
- **Frontend**: A Next.js (React) application styled with TailwindCSS.

## Key Features

- **AI Hub**: Automated question generation, distractor creation, and OCR cleanup via integrations with OpenAI, Gemini, and Claude.
- **Proctoring**: Strict monitoring including tab tracking, full-screen enforcement, copy-paste prevention, and webcam face detection.
- **Practice Center**: Personalized study tracks based on weak area analytics.
- **Version Control**: Complete audit logs and version history for questions and quizzes.
- **Review Workflow**: A structured pipeline ensuring content is vetted before publication.

## Quick Start (Docker)

The fastest way to run QuizCraft locally is via Docker Compose:

1. Clone both repositories into adjacent directories.
2. Ensure you have Docker and Docker Compose installed.
3. In the root directory containing the `docker-compose.yml`, run:
   ```bash
   docker-compose up -d --build
   ```
4. Access the frontend at `http://localhost:3000` and the backend API at `http://localhost:5000`.

## Documentation

Comprehensive documentation can be found in the `docs/` directory:
- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Database Schema](docs/DATABASE.md)
- [Security Guidelines](docs/SECURITY.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Contributing](docs/CONTRIBUTING.md)

## License
Proprietary. All rights reserved.
