## ADDED Requirements

### Requirement: ISO8601 Duration Conversion
The system SHALL convert Clockify's ISO8601 duration strings into total minutes.

#### Scenario: Basic duration
- **WHEN** a duration string like "PT1H30M" is processed
- **THEN** the system SHALL calculate exactly 90 minutes

#### Scenario: Sub-minute rounding
- **WHEN** a duration string has seconds (e.g., "PT10S")
- **THEN** the system SHALL round up to the nearest minute

### Requirement: Data Flattening
The system SHALL flatten nested Clockify objects into a primitive domain model.

#### Scenario: Nested project mapping
- **WHEN** an entry has a nested `project.name` object
- **THEN** the normalized object SHALL have a top-level `projectName` string field
