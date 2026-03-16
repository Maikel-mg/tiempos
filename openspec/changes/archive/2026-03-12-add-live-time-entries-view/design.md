## Context

The backend already has an endpoint at `/api/time-entries` that communicates with the Clockify API using credentials from the `.env` file. The frontend needs to consume this endpoint and present the data to the user in a new page.

## Goals / Non-Goals

**Goals:**
- Fetch data from the backend API.
- Present data in a professional-looking table using shadcn/ui components if available, or clean Tailwind styles.
- Handle different API states (loading, success, empty, error).
- Format durations and dates for human readability.

**Non-Goals:**
- Modifying the backend date range (currently hardcoded to 2026-03-01 to 2026-03-12).
- Implementing filtering or search on the client side (out of scope for initial version).
- Editing or deleting entries from this view.

## Decisions

- **Data Fetching**: Use standard `fetch` API within a `useEffect` hook in `LiveTimeEntriesPage.jsx`. Given the small scope, a library like TanStack Query is not required but could be added later if needed.
- **Component Reuse**: Reuse existing table styles or components from the CSV wizard to maintain consistency.
- **Date Formatting**: Use `Intl.DateTimeFormat` for dates and a helper function for durations (HH:mm:ss).
- **Navigation Integration**: Replace the placeholder created in the previous change with the actual implementation.

## Risks / Trade-offs

- **[Risk] Backend Latency**: Clockify API can be slow.
  - **Mitigation**: Implement a clear loading state in the UI.
- **[Risk] API Key/Permission Errors**: If the backend is misconfigured, the API call will fail.
  - **Mitigation**: Catch errors and show a user-friendly message with the specific error if possible.
