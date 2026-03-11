## ADDED Requirements

### Requirement: Task mapping persistence
The system SHALL store task-to-process ID mappings in the browser's `localStorage` to ensure they persist across browser sessions and refreshes.

#### Scenario: Persistent mapping after refresh
- **WHEN** user enters a process ID for a task and refreshes the page
- **THEN** the task-to-process ID mapping is automatically loaded from `localStorage`

### Requirement: Automatic mapping updates
The system SHALL update the persistent store whenever a valid process ID is entered or modified by the user.

#### Scenario: Update existing mapping
- **WHEN** user changes the process ID for a previously mapped task
- **THEN** the new mapping is saved to `localStorage`, overwriting the previous one
