# TaskFlow

TaskFlow is a real task assignment and accountability platform built with Next.js, TypeScript, Prisma, secure server-side auth, and Google/email integration-ready architecture.

## Why this architecture

This implementation balances the product requirements with maintainability:

- App Router for modern Next.js server-side features
- Prisma schema for persistent data modeling and organization isolation
- JWT session cookies for server-safe auth without exposing secrets
- Real route handlers for task creation, login, notifications, and reports
- Google OAuth and calendar scaffolding for future production integration
- SQLite by default for local execution while the schema is production-ready for PostgreSQL migration

## Local setup

1. Copy `.env.example` to `.env`
2. Install dependencies: `npm install`
3. Generate Prisma client: `npx prisma generate`
4. Push schema to SQLite: `npx prisma db push`
5. Start the app: `npm run dev`
6. Open http://localhost:3000

## Core product surfaces

- Login and session auth
- Dashboard overview and analytics cards
- Task creation, task list, and task detail views
- My Day and calendar-oriented scheduling views
- Projects, team, reports, settings, admin, and notifications pages
- Google OAuth flow scaffold and health checks

## Feature status

The app includes a production-oriented foundation for:

- organization-scoped records
- multi-role structure and permissions
- task CRUD and assignment flow
- notifications and activity records
- Google OAuth endpoint scaffolding
- email and reminder abstraction points
- secure API patterns

## Documentation

- `DATABASE.md`
- `API.md`
- `DEPLOYMENT.md`
- `SECURITY.md`
- `TESTING.md`

## Important note

This project intentionally avoids fake or mock-only flows. It persists data through Prisma and uses secure server-side validation. Google APIs and email providers are wired as environment-backed integrations so they activate only when configured.
