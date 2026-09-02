# API documentation

## Authentication

### POST /api/auth/register
Creates a user and organization.

Body:

```json
{
  "name": "Aisha Patel",
  "email": "aisha@company.com",
  "password": "StrongPass123",
  "companyName": "Northwind Digital"
}
```

### POST /api/auth/login
Creates a signed session cookie.

Body:

```json
{
  "email": "aisha@company.com",
  "password": "StrongPass123"
}
```

### POST /api/auth/logout
Clears the session cookie.

## Tasks

### GET /api/tasks
Returns all tasks for the current organization.

### POST /api/tasks
Creates a new task.

Body:

```json
{
  "title": "Vendor research",
  "description": "Compile a short list of 20 vendors in the region",
  "assigneeEmail": "rahul@company.com",
  "dueAt": "2026-09-10T17:00:00.000Z",
  "priority": "HIGH",
  "taskStatus": "ASSIGNED",
  "calendarSyncEnabled": true,
  "emailEnabled": true
}
```

### GET /api/tasks/[id]
Gets a single task and related metadata.

### PATCH /api/tasks/[id]
Updates task status or metadata.

## Notifications

### GET /api/notifications
Returns notifications for the current user.

## Reports

### GET /api/reports
Returns aggregated task health and completion metrics.

## Google OAuth

### GET /api/google
Returns the OAuth URL when credentials are configured.

### GET /api/google/callback
Handles the OAuth redirect and stores token metadata.

## Health

### GET /api/health
Returns service health status.
