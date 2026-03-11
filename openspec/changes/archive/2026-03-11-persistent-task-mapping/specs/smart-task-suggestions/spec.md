## ADDED Requirements

### Requirement: Task ID suggestions
The system SHALL provide process ID suggestions for tasks in an uploaded CSV based on previously saved mappings.

#### Scenario: Suggestion for known task
- **WHEN** user uploads a CSV containing a task name that has been previously mapped to a process ID
- **THEN** the system pre-fills the process ID field for that task with the stored value

### Requirement: Sanitized task name matching
The system SHALL attempt to match task names using a sanitized approach (lowercase, trimmed) to account for minor formatting differences.

#### Scenario: Matching with minor name variations
- **WHEN** user uploads a CSV with a task name that differs only by casing or leading/trailing spaces from a previously mapped task
- **THEN** the system still suggests the correct process ID for that task
