# Security guide

## Core controls

- Server-side authorization for every protected route and API
- Session cookies with HttpOnly and SameSite security settings
- Input validation with Zod
- Prisma prevents SQL injection by parameterized queries
- Organization scoping for all organization-specific reads and writes
- No secrets checked into source control

## OAuth and tokens

- Keep Google OAuth credentials in environment variables
- Store token metadata securely
- Rotate tokens if invalid or revoked
- Never expose access tokens to the browser

## File handling

- Validate extension, MIME type, and file size
- Restrict executables and unsafe payloads
- Enforce storage authorization

## Operational hardening

- Keep Prisma migrations in version control
- Monitor logs for auth failures and job issues
- Add rate limiting in production
- Use HTTPS only in production
- Review audit logs for admin actions and access anomalies
