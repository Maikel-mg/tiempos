## Context

The web application runs in the browser (client-side only). To execute SQL against SQL Server, we need either:
1. A backend API that executes SQL on behalf of the client
2. Direct connection from browser (not recommended for security/CORS)

Given the current architecture is client-only, we'll add a lightweight backend endpoint.

## Goals / Non-Goals

**Goals:**
- Allow users to configure SQL Server connection details
- Test connection before executing SQL
- Preview SQL in a modal before execution
- Execute SQL and show results
- Securely store connection config (encrypted in localStorage)

**Non-Goals:**
- Complex query building (only INSERT/UPDATE for task creation)
- Multiple database support (SQL Server only initially)
- Query history or saved queries

## Decisions

### Decision 1: Connection approach

**Option A:** Browser direct connection (tedious, CORS issues)
**Option B:** Add backend endpoint `/api/execute-sql`
**Option C:** Use a serverless function

**Chosen:** Option B - Add a simple Express endpoint. The frontend already exists, we just need a small backend.

### Decision 2: Where to execute from

**Option A:** Execute from Step2 (per-task SQL)
**Option B:** Execute from Step3 (batch SQL)
**Option C:** Both

**Chosen:** Option C - Add execution buttons to both steps. Step2 for individual tasks, Step3 for batch.

### Decision 3: Connection storage

**Option A:** config.json (committed to repo - BAD)
**Option B:** localStorage (browser only)
**Option C:** Environment variables (backend only)

**Chosen:** Option B - Store encrypted in localStorage, never sent to server except via the execute endpoint.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│ SQL Server  │
│   (React)   │     │  (Express)  │     │  Database  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │ /api/test-conn    │
       │ /api/execute-sql │
       └───────────────────┘
```

## Risks / Trade-offs

- [Risk] SQL injection → Mitigate by using parameterized queries where possible
- [Risk] Connection string exposure → Mitigate by encrypting in localStorage
- [Risk] Long-running queries → Add timeout, show progress
