## Why

Currently the application only generates SQL scripts that users must copy and execute manually in SQL Server Management Studio. Users need a more streamlined workflow to connect directly to the database, test the connection, preview SQL before execution, and execute it from the UI.

## What Changes

- Add database connection configuration (server, database, credentials) stored in config or localStorage
- Add "Test Connection" button to verify database connectivity before executing
- Add SQL preview dialog showing the SQL that will be executed
- Add "Execute SQL" button to run the SQL directly against the database
- Show execution results (success/error) in the UI

## Capabilities

### New Capabilities
- `db-connection`: Store and manage SQL Server connection configuration
- `db-execution`: Execute generated SQL directly against the database with preview and results

### Modified Capabilities
- `sql-generation`: Extended to include execution option alongside copy/download

## Impact

- New config section in Step1 for database connection details
- New component for SQL preview and execution dialog
- Backend API endpoint or direct database connection from frontend (if using a proxy)
