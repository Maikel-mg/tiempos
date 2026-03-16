## Context

The application currently has two primary ways to access time entry data:
1. A multi-step CSV import process.
2. A live view fetching data from the Clockify API (`LiveTimeEntriesPage`).

The SQL generation and database execution logic is currently coupled with the CSV import process, specifically in `Step3Preview.jsx` and `sql-generator.js`. This design aims to decouple that logic and expose it in the live view.

## Goals / Non-Goals

**Goals:**
- Abstract `sql-generator.js` to support both indexed arrays (CSV) and structured objects (API).
- Implement row selection and action management in `LiveTimeEntriesPage`.
- Provide SQL preview and download capabilities for live data.
- Allow direct database execution of generated SQL from the live view.

**Non-Goals:**
- Modifying the backend API (`/api/time-entries` or `/api/execute-sql`).
- Changing the existing CSV import flow (except for internal generator improvements).

## Decisions

- **Data Adapter Pattern**: Modify `generateSQL` to accept a standard object format. The Live view will transform API objects to this format. The CSV flow will transform indexed rows to this format before calling the generator.
- **Shared Configuration**: Both views will read `taskMapping` and `config` from `localStorage` to ensure consistency in table/column names and task IDs.
- **Reusable Preview UI**: Components or logic from `Step3Preview.jsx` (like `formatSQLForHighlight` and the preview scroll area) will be extracted or replicated for the Live view.

## Risks / Trade-offs

- **[Risk]** Inconsistent data fields between CSV and API (e.g., date formats). → **[Mitigation]** Standardize on ISO format internally and use formatters at the adapter level.
- **[Risk]** Missing User field in Live API entries. → **[Mitigation]** Use a fallback mechanism (e.g., configurable default user or extract from entry metadata if available).
- **[Trade-off]** Code duplication between `Step3Preview` and `LiveTimeEntriesPage` vs. extracting a shared component. → **Decision**: Prioritize extraction of logic first; UI components can be shared via the existing UI library.
