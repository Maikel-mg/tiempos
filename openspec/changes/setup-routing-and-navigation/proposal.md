## Why

The current application is limited to a single flow (CSV import), making it impossible to add new features like live data viewing without cluttering the UI. Introducing routing enables a scalable, multi-functional architecture with a clear entry point.

## What Changes

- Install `react-router-dom` as a new dependency.
- Create a `HomePage` landing screen as the new default route (`/`).
- Refactor the current wizard flow from `App.jsx` into a dedicated `ImportCsvPage` component mapped to `/import`.
- Add a shared `Navigation` component for moving between features.
- Update `main.jsx` to provide the router context.

## Capabilities

### New Capabilities
- `application-routing`: Core navigation structure and route definitions.
- `landing-screen`: Home page allowing users to choose between CSV import and live data viewing.

### Modified Capabilities
- `web-import-wizard`: Transition from a standalone application entry point to a sub-page within the routed application.

## Impact

- `package.json`: New dependency `react-router-dom`.
- `App.jsx`: Complete refactor to handle routing instead of logic.
- `web-ui/src/pages/`: New directory for page-level components.
- `web-ui/src/components/Navigation.jsx`: New shared component.
