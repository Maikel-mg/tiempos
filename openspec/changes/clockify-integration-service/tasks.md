## 1. Setup and Ports

- [x] 1.1 Create the directory structure for the new module (`server/services/clockify/`)
- [x] 1.2 Define the domain interfaces (Input/Output Ports) in a central types file

## 2. Normalization Engine (Pure Logic)

- [x] 2.1 Implement the ISO8601 duration parser (pt-duration-to-minutes.js)
- [x] 2.2 Add unit tests for the duration parser
- [x] 2.3 Implement the entry flattener/adapter that converts raw Clockify JSON to the TimeEntry model

## 3. Infrastructure (Adapters)

- [x] 3.1 Implement the `ClockifyHttpAdapter` for the standard Time Entries API (GET)
- [x] 3.2 Implement the `ClockifyReportsAdapter` for the Detailed Reports API (POST)
- [x] 3.3 Create a factory/orchestrator to choose between adapters based on the request date range

## 4. Integration and Refactoring

- [x] 4.1 Update `server.js` to use the new `ClockifyIntegrationService` for the `/api/clockify/entries` endpoint
- [x] 4.2 Update `LiveTimeEntriesPage.jsx` to consume the normalized data format
- [x] 4.3 Verify that the SQL preview still works correctly with the new data structure
