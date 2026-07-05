# QuizCraft Environment Variables

This document lists all environment variables required to run the QuizCraft backend (Phase 20).

## Core Configuration
- `NODE_ENV`: The environment the app is running in (`development`, `test`, `production`).
- `PORT`: The port the Express server binds to (default: `3001`).
- `FRONTEND_URL`: The URL of the Next.js frontend, used for CORS configuration (e.g., `http://localhost:3000`).

## Database
- `DATABASE_URL`: The PostgreSQL connection string used by Prisma.
  - *Format*: `postgresql://<user>:<password>@<host>:<port>/<db_name>?schema=public`

## Authentication
- `JWT_SECRET`: A strong random string used to sign JWT access tokens.
- `JWT_EXPIRES_IN`: Expiration time for access tokens (e.g., `15m`).
- `JWT_REFRESH_SECRET`: A strong random string used to sign JWT refresh tokens.
- `JWT_REFRESH_EXPIRES_IN`: Expiration time for refresh tokens (e.g., `7d`).

## Caching & Queues
- `REDIS_URL`: The connection string for the Redis instance used for caching and BullMQ.
  - *Format*: `redis://<user>:<password>@<host>:<port>`

## AI Integration
- `OPENAI_API_KEY`: API key for OpenAI (used for quiz generation and evaluations).
- `ANTHROPIC_API_KEY`: (Optional) Fallback API key for Claude 3 models.
- `AI_PROVIDER_DEFAULT`: Specifies the default provider to use (`openai` or `anthropic`).

## External Services
- `AWS_ACCESS_KEY_ID`: AWS Access Key for S3 file uploads (images, PDFs).
- `AWS_SECRET_ACCESS_KEY`: AWS Secret Key.
- `AWS_REGION`: AWS Region for S3.
- `AWS_S3_BUCKET_NAME`: The name of the S3 bucket storing quiz assets.

> **Warning:** Never commit `.env` files to version control. Use `.env.example` to track required variables without their actual values.
