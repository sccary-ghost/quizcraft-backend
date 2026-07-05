# QuizCraft Deployment Guide

This document details the deployment infrastructure and CI/CD pipelines for QuizCraft (Phase 20).

## 1. Containerization
QuizCraft relies on Docker for consistent environments across Dev, Test, and Production.
- `Dockerfile`: Multi-stage build for the Express application, optimizing production image size.
- `docker-compose.yml`: Defines the local stack containing `api`, `postgres`, and `redis`.

## 2. CI/CD Pipeline (GitHub Actions)
Our automated pipeline ensures code quality and seamless deployments.
- **Path:** `.github/workflows/main.yml`
- **Triggers:** Push to `main`, Pull Requests to `main`.
- **Stages:**
  1. **Lint & Type Check:** Runs ESLint, Prettier, and TypeScript compiler.
  2. **Test:** Runs Jest unit and integration tests against an ephemeral Postgres container.
  3. **Build:** Builds the Docker image.
  4. **Deploy (Prod only):** Pushes the image to AWS ECR and triggers an ECS service update.

## 3. Production Infrastructure (AWS)
- **Compute:** AWS ECS (Fargate) for serverless container execution.
- **Database:** AWS RDS for PostgreSQL with automated daily backups and Multi-AZ enabled for high availability.
- **Cache:** AWS ElastiCache for Redis.
- **Frontend:** Vercel (connected directly to the frontend repository for edge deployment).
- **Reverse Proxy / Load Balancer:** AWS Application Load Balancer (ALB) handles HTTPS termination and routes traffic to ECS tasks.

## 4. Environment Variables Management
Secrets and environment variables are strictly managed using AWS Systems Manager Parameter Store or GitHub Secrets. No `.env` files are ever committed.

## 5. Logging and Monitoring
- **Logs:** Winston logs are shipped directly to AWS CloudWatch or Datadog.
- **APM:** Datadog agent is attached to the ECS task for real-time application performance monitoring and tracing.
- **Alerts:** Automated Slack notifications for 5xx error spikes or database CPU exhaustion.
