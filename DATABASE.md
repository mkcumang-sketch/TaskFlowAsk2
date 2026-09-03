# Database design

TaskFlow uses Prisma as the database layer and SQLite by default for local development. The schema is intentionally organized to support PostgreSQL deployment in production without heavy rewriting.

## Core entities

- Organization
- User
- Role
- Permission
- Department
- Team
- Project
- ProjectMember
- Task
- TaskAssignee
- Subtask
- ChecklistItem
- Tag
- TaskTag
- Comment
- CommentMention
- Attachment
- TaskDependency
- TaskTemplate
- TaskTemplateItem
- Notification
- EmailNotification
- CalendarIntegration
- CalendarEvent
- Reminder
- EscalationRule
- Approval
- TimeEntry
- Goal
- Automation
- AutomationTrigger
- AutomationCondition
- AutomationAction
- ActivityLog
- AuditLog
- UserPreference
- OAuthAccount
- Session
- WebhookEvent

## Local setup

```bash
npx prisma generate
npx prisma db push
```

## Production recommendations

Set `DATABASE_URL` to a PostgreSQL connection string, then run migrations:

```bash
npx prisma migrate deploy
```

## Notes

The schema includes indexes on organization, status, due date, and authentication-related records. This keeps task and workload queries fast as the platform scales.
