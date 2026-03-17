## Why

Clockify integration logic is currently scattered across the backend (`server.js`), frontend components (`LiveTimeEntriesPage.jsx`), and converters. This fragmentation makes it difficult to maintain, test in isolation, and results in duplicated domain knowledge about Clockify's API quirks (like ISO8601 duration parsing).

## What Changes

- **Centralized Service**: Consolidate all Clockify logic into a single, deep module.
- **Normalization Engine**: Implement a pure transformation layer to convert Clockify's raw data (ISO8601, nested objects) into the application's internal "TimeEntry" model.
- **API Client Abstraction**: Centralize authentication and request logic to handle both the regular API and the Reports API seamlessly.
- **Improved Testability**: Separate infrastructure (HTTP calls) from domain logic (data transformation) using a ports-and-adapters pattern.

## Capabilities

### New Capabilities
- `clockify-fetching`: Unified interface for retrieving time entries and workspaces.
- `clockify-normalization`: Pure logic for transforming external API data into domain-ready objects.
- `clockify-api-client`: Centralized request handling and authentication for Clockify APIs.

### Modified Capabilities
- None.

## Impact

- **server.js**: Reduced complexity by delegating Clockify requests to the new service.
- **LiveTimeEntriesPage.jsx**: Simplified UI logic as it will now receive normalized data.
- **Testing**: Higher confidence through isolated unit tests for the normalization engine.
- **sql-generator**: Can be simplified to expect a standard TimeEntry format.
