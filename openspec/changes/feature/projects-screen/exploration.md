## Exploration: feature/projects-screen

### Current State
The application currently has features for importing CSVs, fetching live entries from Clockify, and a dashboard. It also has a basic time-tracking screen (`TimeTrackingPage`) with hardcoded tasks. There is no screen to view or select real projects from the SQL Server database. The backend has several endpoints in `server.ts` to execute SQL and call stored procedures, but none for listing projects.

### Affected Areas
- `server.ts` — Need to add a new endpoint `/api/projects` to call `spNETProyectos_SeleccionProyectos`.
- `web-ui/src/App.tsx` — Add route for the new Projects page.
- `web-ui/src/components/AppLayout.tsx` — Add "Proyectos" to the sidebar navigation.
- `web-ui/src/features/` — Create a new `projects` feature folder.
- `web-ui/src/features/projects/` — New components, hooks, and services for project management.

### Approaches
1. **Integrated Feature** — Create a new feature folder `web-ui/src/features/projects` following the existing pattern (components, hooks, services).
   - Pros: Consistent with current architecture, clean separation of concerns, easy to extend.
   - Cons: Slightly more initial setup.
   - Effort: Medium

2. **Simple Page** — Just add a new page in `web-ui/src/pages/ProjectsPage.tsx` and put all logic there.
   - Pros: Faster for a very simple read-only screen.
   - Cons: Harder to maintain if it grows, deviates from the "features" pattern used for more complex logic.
   - Effort: Low

### Recommendation
I recommend **Approach 1 (Integrated Feature)**. Even if the initial requirement is a read-only screen, having it structured as a feature allows for future enhancements (like selecting a project for time tracking) and keeps the codebase organized.

### Risks
- **SQL Server Connection** — The endpoint requires a valid SQL Server connection. If the user hasn't configured it yet, the screen will show an error.
- **Stored Procedure Parameters** — The stored procedure expects `@pFecha`, `@pModoProc`, and `@pUsured`. These should be handled carefully (e.g., providing defaults or allowing user input).
- **Schema Mapping** — Ensure the frontend types accurately reflect the result set from the stored procedure.

### Ready for Proposal
Yes. I have a clear understanding of the backend and frontend changes needed. I can now proceed to create a proposal.
