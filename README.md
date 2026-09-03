# TaskFlow

TaskFlow is a real task assignment and accountability platform built with Next.js, TypeScript, Prisma, secure server-side auth, and Google/email integration-ready architecture.

## Why this architecture

This implementation balances the product requirements with maintainability:

- App Router for modern Next.js server-side features
- Prisma schema for persistent data modeling and organization isolation
- JWT session cookies for server-safe auth without exposing secrets
- Real route handlers for task creation, login, notifications, and reports
- Google OAuth and calendar integration with encrypted token storage
- PostgreSQL for development and production

## Local setup

1. Copy `.env.example` to `.env`
2. Install dependencies: `npm install`
3. Set a PostgreSQL `DATABASE_URL` in `.env`
4. Generate Prisma client: `npx prisma generate`
5. Apply migrations: `npx prisma migrate dev`
6. Start the app: `npm run dev`
7. Open http://localhost:3000

## Admin setup

Use the single server-side seed mechanism. It never contains credentials in source:

```powershell
$env:ADMIN_EMAIL = "admin@ask2global.com"
$env:ADMIN_PASSWORD = "Admin@2390"
npm run prisma:seed-admin
```

For production, run `npm run prisma:migrate:deploy` before starting the application.

## Core product surfaces

- Login and session auth
- Dashboard overview and analytics cards
- Task creation, task list, and task detail views
- My Day and calendar-oriented scheduling views
- Projects, team, reports, settings, admin, and notifications pages
- Google OAuth flow and health checks

## Feature status

The app includes a production-oriented foundation for:

- organization-scoped records
- multi-role structure and permissions
- task CRUD and assignment flow
- notifications and activity records
- Google OAuth endpoint and calendar integration
- email and reminder abstraction points
- secure API patterns

## Documentation

- `DATABASE.md`
- `API.md`
- `DEPLOYMENT.md`
- `SECURITY.md`
- `TESTING.md`
- `ENVIRONMENT.md`

## Current status

This workspace now includes:

- a validated Prisma schema with organization-scoped task and workflow models
- real server-side JWT session auth and organization membership checks
- functional task creation with assignment, tags, checklist, subtasks, dependency recording, and activity logging
- notification and task API flows that persist data in PostgreSQL
- a buildable Next.js app that passes lint and production build validation in the local environment

## Important note

This project intentionally avoids fake or mock-only flows. It persists data through Prisma and uses secure server-side validation. Google APIs and email providers are wired as environment-backed integrations so they activate only when configured.
