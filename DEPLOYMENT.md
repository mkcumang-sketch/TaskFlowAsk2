# Deployment guide

## Local development

```bash
cp .env.example .env
npx prisma generate
npx prisma db push
npm run dev
```

## Production deployment

1. Provision a PostgreSQL database.
2. Add `DATABASE_URL` to the production environment.
3. Set `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `EMAIL_PROVIDER_KEY`, and `NEXT_PUBLIC_APP_URL`.
4. Run migrations: `npx prisma migrate deploy`
5. Build the app: `npm run build`
6. Start the app: `npm run start`

## Recommended infrastructure

- Vercel for Next.js hosting
- Supabase / Neon / managed PostgreSQL for persistence
- Resend for email delivery
- Google Cloud OAuth for Google login and calendar APIs
- Redis for queue workers or recurring reminders

## CI checklist

- Validate Prisma client generation
- Run lint and type checks
- Ensure environment variables are configured
- Confirm OAuth callback URLs are whitelisted
- Validate calendar and email provider connectivity
