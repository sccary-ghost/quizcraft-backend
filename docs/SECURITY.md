# QuizCraft Security Guidelines

Security is a primary concern for QuizCraft (Phase 20). This document outlines the mechanisms protecting our users and infrastructure.

## 1. Authentication & Authorization
- **JWT (JSON Web Tokens):** Access is managed via short-lived access tokens (15m) and HTTP-Only, Secure cookies for refresh tokens (7d). This mitigates XSS attacks on tokens.
- **RBAC (Role-Based Access Control):** Users are assigned roles (`STUDENT`, `INSTRUCTOR`, `ADMIN`). API routes use custom middleware to check roles before processing requests.
- **Password Hashing:** All user passwords are encrypted using `bcrypt` with a salt round of 12.

## 2. Data Protection
- **Encryption in Transit:** All traffic must go over HTTPS (TLS 1.2+). The Nginx reverse proxy forces HTTP to HTTPS redirection.
- **Encryption at Rest:** Sensitive database volumes (PostgreSQL) are encrypted at the block level in production (e.g., AWS EBS encryption).

## 3. Web Vulnerability Mitigations
- **CORS:** Configured strictly to allow requests only from trusted frontend origins (e.g., `https://quizcraft.app`).
- **CSRF:** Implemented Double Submit Cookie pattern for state-changing endpoints where cookies are used.
- **SQL Injection:** Prisma ORM automatically uses parameterized queries, neutralizing SQL injection vectors.
- **XSS (Cross-Site Scripting):** React / Next.js auto-escapes output. API payload inputs are sanitized and validated strictly using Zod.
- **Helmet.js:** Express backend uses Helmet to set secure HTTP headers (HSTS, CSP, X-Frame-Options).

## 4. API Abuse Prevention
- **Rate Limiting:** `express-rate-limit` is used. Standard limits apply to general endpoints, with stricter limits on Authentication and AI generation endpoints to prevent brute-force and billing abuse.
- **Payload Size Limits:** Body-parser limits JSON payloads to `100kb` to prevent Denial of Service (DoS) via massive payloads.

## 5. Dependency Management
- **Audit:** GitHub Actions automatically runs `npm audit` on every PR.
- **Dependabot:** Configured to automatically create PRs for vulnerable dependencies.

## 6. Incident Reporting
If a vulnerability is discovered, do NOT open a public issue. Please email `security@quizcraft.app` immediately.
