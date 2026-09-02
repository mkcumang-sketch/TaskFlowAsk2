# Testing guide

## Recommended checks

- Unit tests for task creation, permissions, and reminder logic
- Integration tests for registration, login, task assignment, and approval flow
- API tests for task creation, notifications, and reports
- Calendar sync tests for event creation and duplicate prevention
- Auth tests for organization scoping and role boundaries

## Commands

```bash
npm run lint
npm run build
npx prisma validate
```

## Suggested test stack

- Vitest or Jest + Testing Library
- Prisma test database for integration checks
- Mock email and calendar providers during unit tests

## Required validation before release

- Login works
- Task creation works
- Assignment email is sent
- Permissions prevent cross-org access
- Dashboard analytics update after status changes
- Google integration fails gracefully when tokens are invalid
