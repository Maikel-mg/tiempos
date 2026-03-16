## ADDED Requirements

### Requirement: Data Source Agnostic SQL Generation
The SQL generation logic SHALL support both indexed arrays (CSV rows) and structured objects (API results) to enable reuse across different data sources.

#### Scenario: Generate SQL from structured object
- **WHEN** a data object containing standard fields (`project`, `task`, `date`, `duration`, `description`, `user`) is provided to the generator
- **THEN** the system SHALL generate the corresponding INSERT statement using the current table configuration
- **AND** the generator SHALL correctly handle data types (e.g., converting ISO dates/durations if necessary or assuming a pre-standardized format)
