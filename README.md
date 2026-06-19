# QuizCraft Backend

Backend API for QuizCraft CBT platform.

## Tech Stack

* Node.js
* Express
* TypeScript
* Prisma
* PostgreSQL

## Features

* Authentication
* Quiz APIs
* Quiz Submission
* Attempts
* Answers
* Analysis API

## Installation

```bash
npm install
```

## Run Development Server

```bash
npm run dev
```

Backend runs on:

```
http://localhost:5000
```

## Environment Variables

Create `.env`

```env
DATABASE_URL=your_database_url
JWT_SECRET=your_secret_key
PORT=5000
```

## Database

Run:

```bash
npx prisma migrate dev
```

Start Prisma Studio:

```bash
npx prisma studio
```
