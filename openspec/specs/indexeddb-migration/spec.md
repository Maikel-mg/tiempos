# Delta for indexeddb-migration

## ADDED Requirements

### Requirement: Dexie Schema Version 2

The system SHALL define Dexie schema version 2 with tables: `timeEntries` (indexes: `id, taskId, date, startTime, endTime, synced, createdAt, serverId`), `processes` (indexes: `proceso, nombre`), `processRecents` (indexes: `proceso`), and `timerState` (index: `id`).

#### Scenario: Schema version is 2

- GIVEN the IndexedDB database exists
- WHEN the Dexie version check runs
- THEN `TimeTrackerDB.version` is 2
- AND `timeEntries` has a `synced` index and a `serverId` index
- AND `processes` and `processRecents` tables exist

### Requirement: taskId Migration from string to number

The system SHALL convert every `timeEntries.taskId` from `string` to `number` during the v1→v2 upgrade. A `taskId` value is valid if and only if `Number.isFinite(parsed) && parsed > 0 && Number.isInteger(parsed)` after `Number()` conversion. Invalid entries SHALL be deleted.

#### Scenario: Valid numeric string taskId

- GIVEN a timeEntry with `taskId: "42"`
- WHEN the v1→v2 migration runs
- THEN the entry's `taskId` becomes `42` (number)
- AND the entry is preserved

#### Scenario: Invalid taskId discarded

- GIVEN a timeEntry with `taskId: "abc"`
- WHEN the v1→v2 migration runs
- THEN the entry is deleted from the database
- AND the discard count increments

#### Scenario: Negative or zero taskId discarded

- GIVEN a timeEntry with `taskId: "0"` or `taskId: "-5"`
- WHEN the v1→v2 migration runs
- THEN the entry is deleted

#### Scenario: Floating-point taskId discarded

- GIVEN a timeEntry with `taskId: "3.14"`
- WHEN the v1→v2 migration runs
- THEN the entry is deleted

#### Scenario: Empty DB migration

- GIVEN an empty `timeEntries` table
- WHEN the v1→v2 migration runs
- THEN no entries are created or deleted
- AND the discard count is 0

### Requirement: One-time warning toast on discard

The system SHALL show a warning toast on first app load after migration if any entries were discarded. The toast SHALL display the count of discarded entries. The warning SHALL be shown at most once per migration.

#### Scenario: Toast shown when entries discarded

- GIVEN 3 entries were discarded during migration
- WHEN the app loads for the first time after upgrade
- THEN a warning toast is displayed with the discard count

#### Scenario: No toast when nothing discarded

- GIVEN 0 entries were discarded during migration
- WHEN the app loads after upgrade
- THEN no warning toast is displayed

#### Scenario: Toast not shown on subsequent loads

- GIVEN the warning toast was shown once
- WHEN the app is reloaded
- THEN the toast is not shown again

### Requirement: Idempotent migration

Running the migration logic twice SHALL produce the same database state as running it once. No duplicate rows, no double-conversions, no data corruption.

#### Scenario: Migration idempotency

- GIVEN the v1→v2 migration has already run and converted all `taskId` values
- WHEN the migration logic is invoked again (simulating a second `onupgradeneeded`)
- THEN all `taskId` values remain numbers
- AND no entries are duplicated or lost

### Requirement: Version mismatch guard

If the database is already at version ≥ 2, the migration code SHALL NOT re-run the v1→v2 conversion logic.

#### Scenario: Existing v2 database skips migration

- GIVEN the database is already at version 2 with converted data
- WHEN the app opens
- THEN the `onupgradeneeded` handler does not re-process entries
