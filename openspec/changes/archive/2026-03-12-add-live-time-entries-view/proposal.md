## Why

The backend already provides an `/api/time-entries` endpoint that fetches live data from Clockify. However, this data is currently not visible to the user in the web UI. Adding a dedicated view for this data allows users to verify their current time entries before or after performing imports.

## What Changes

- Create a new `LiveTimeEntriesPage` component.
- Implement data fetching from the backend `/api/time-entries` endpoint.
- Display the entries in a sortable and readable table.
- Add loading states and error handling for the API call.

## Capabilities

### New Capabilities
- `live-time-entries-view`: Visualization of real-time entries fetched from Clockify.

### Modified Capabilities
None.

## Impact

- `web-ui/src/pages/LiveTimeEntriesPage.jsx`: New page component.
- `web-ui/src/App.jsx`: Link the new page to the `/live-entries` route (replacing the placeholder).
- `server.js`: Uses existing endpoint.
