# Prisma migrations

The schema targets PostgreSQL. Use `npm run prisma:migrate` during development
to create a reviewed migration, and `npm run prisma:migrate:deploy` in staging
or production. Do not use `prisma db push` for production schema changes.

Before creating the first migration against an existing PostgreSQL database,
take a backup and baseline the database if it already contains the schema.
The tracked `prisma/dev.db` is a legacy SQLite artifact and is not used by the
current PostgreSQL schema.
