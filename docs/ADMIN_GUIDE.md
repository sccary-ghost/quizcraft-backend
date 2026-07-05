# Administrator Guide

Welcome to the QuizCraft Administrator Guide. This document provides a comprehensive overview of managing the QuizCraft CBT Platform as an Administrator.

## 1. Dashboard & Overview
Upon logging in as an Admin, you are presented with the **Admin Dashboard**. This dashboard aggregates statistics on:
- Active candidates and tests.
- System health (cache, database metrics).
- Recent AI usage logs and Proctoring violations.

## 2. Test Management
Navigate to the **Tests** tab to manage exams.
- **Create a Test**: Define the title, duration, and test settings (e.g., shuffling, result visibility, passing score).
- **Assign Questions**: Pull questions from the central **Question Bank** or add specific folders.
- **Publish**: Once reviewed, toggle a test from `DRAFT` to `PUBLISHED`. Candidates can only see published tests.

## 3. Question Bank & Versioning
- **Folders**: Organize questions into nested folders for easy retrieval.
- **Rich Text Editor**: Create questions with rich formatting, embedded images, and code snippets.
- **Bulk Upload**: Import questions in bulk via CSV/XLSX.
- **Versioning**: Every edit creates a new version of the question. You can review the version history and restore previous versions if needed.

## 4. AI Hub
The AI Hub provides tools for automated content generation:
- **Question Generation**: Auto-generate questions based on a topic or syllabus text.
- **Distractor Generation**: Generate plausible wrong options for MCQs.
- **Grammar & Cleanup**: Use AI to clean up OCR text or fix grammatical errors.
- **Configuration**: Switch between OpenAI, Gemini, Claude, or Ollama in the Settings.

## 5. Proctoring & Review
- **Live Violations**: Monitor candidates in real-time. The system flags tab-switching, external displays, and face-mismatches.
- **Violation Severity**: Violations are ranked (LOW, MEDIUM, HIGH, CRITICAL). Admins can terminate a test session manually for CRITICAL violations.

## 6. Reports & Analytics
- **Candidate Performance**: View detailed breakdowns of individual candidate attempts.
- **Test Analytics**: Analyze question difficulty (e.g., questions where >80% fail).
- **Export**: Export reports to CSV or PDF for compliance.

## 7. Organization Settings
- **Branding**: Customize the logo and color scheme for the Candidate portal.
- **Email & Notifications**: Configure SMTP settings for automated emails.
- **RBAC**: Add secondary admins with restricted permissions (e.g., "Viewer", "Content Creator").
