## ADDED Requirements

### Requirement: Unified Entry Retrieval
The system SHALL provide a single entry point for retrieving time entries regardless of the underlying Clockify API (v1 vs Reports).

#### Scenario: Recent data fetch
- **WHEN** entries are requested for the current day
- **THEN** the system SHALL use the standard v1 Time Entry API
- **AND** return normalized objects

#### Scenario: Historical data fetch
- **WHEN** entries are requested for a date range exceeding the standard API limits
- **THEN** the system SHALL automatically switch to the Reports API

### Requirement: Workspace Listing
The system SHALL allow fetching available workspaces for a given API key.

#### Scenario: Successful workspace fetch
- **WHEN** workspaces are requested with a valid API key
- **THEN** return an array of workspace IDs and names
