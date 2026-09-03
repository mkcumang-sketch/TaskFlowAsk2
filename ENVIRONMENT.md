# Environment configuration

TaskFlow reads its configuration from environment variables at runtime. For local development, copy the values from `.env.example` into a local `.env` file.

## Required variables

- `DATABASE_URL` — Prisma database connection string. Local SQLite defaults to `file:./dev.db`.
- `AUTH_SECRET` — server-side secret for JWT session signing.
- `JWT_SECRET` — legacy compatibility alias for the same purpose.
- `NEXTAUTH_SECRET` — compatibility alias for auth libraries.
- `NEXT_PUBLIC_APP_URL` — public application base URL, such as `http://localhost:3000`.

## OAuth and integrations

- `GOOGLE_CLIENT_ID` — Google OAuth client ID.
- `GOOGLE_CLIENT_SECRET` — Google OAuth client secret. Never expose this on the client.
- `GOOGLE_REDIRECT_URI` — OAuth callback endpoint.
- `RESEND_API_KEY` — API key for Resend email delivery.
- `EMAIL_FROM` — sender address used for notifications.

## AI providers

- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `OPENROUTER_API_KEY`

These are optional for local development but required to enable provider-backed AI features.

## Background jobs and storage

- `REDIS_URL` — Redis connection for queues and retries when enabled.
- `STORAGE_ENDPOINT`
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`
- `STORAGE_BUCKET`

## Notes

- Never commit real secrets to source control.
- Keep `.env` local-only and add it to your `.gitignore` policy.
- In production, prefer a secure secret manager or cloud environment configuration instead of local files.
