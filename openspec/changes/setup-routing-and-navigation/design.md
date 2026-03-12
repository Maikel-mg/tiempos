## Context

The current application is a single-step React application where `App.jsx` manages both the state (via `useWizard`) and the rendering of the 3-step import process. To support multiple features (CSV Import and Live Data), we need a routing layer and a landing page.

## Goals / Non-Goals

**Goals:**
- Implement client-side routing using `react-router-dom`.
- Create a clean `HomePage` with cards for feature selection.
- Refactor the existing import logic into a separate page component without breaking functionality.
- Ensure global state (like DB connection) persists when navigating between pages.

**Non-Goals:**
- Implementing the "Live Time Entries" view (this is for the next change).
- Redesigning the existing 3-step wizard UI.
- Moving backend logic.

## Decisions

- **Routing Library**: Use `react-router-dom` (v6+). It's the industry standard for React and provides all necessary features for this transition.
- **Project Structure**: Introduce a `src/pages` directory. Page-level components will live here, while reusable UI elements stay in `src/components`.
- **State Management**: Keep the `useWizard` state and `dbConfig` state in `App.jsx` (or a Context Provider) to ensure data is not lost when switching between the Home page and the Import page.
  - *Alternative considered*: Putting state inside `ImportCsvPage`. *Rejected* because navigating back to Home and then back to Import would clear the uploaded file and mappings.
- **Navigation**: Create a simple `Navigation` component (likely a Header) that appears on all sub-pages to allow easy return to the Home screen.

## Risks / Trade-offs

- **[Risk] State Complexity**: Passing too many props from `App.jsx` down to `ImportCsvPage`. 
  - **Mitigation**: If prop drilling becomes excessive, wrap the application in a `WizardContext`.
- **[Risk] Route Mismatches**: User bookmarks a sub-page and loses context.
  - **Mitigation**: Ensure all necessary state is initialized or handled gracefully.
- **[Trade-off] Bundle Size**: Adding `react-router-dom` increases the bundle size slightly, but the benefit of a better UX and architecture outweighs this.
