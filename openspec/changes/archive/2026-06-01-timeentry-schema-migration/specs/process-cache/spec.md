# Delta for process-cache

## ADDED Requirements

### Requirement: Processes Table

The system SHALL store a `processes` table in Dexie with schema `{ proceso: number, nombre: string }` and indexes on `proceso` and `nombre`.

#### Scenario: Process stored and retrieved

- GIVEN a process `{ proceso: 42, name: "Desarrollo" }` is inserted into `processes`
- WHEN the process is queried by `proceso: 42`
- THEN the returned record matches the inserted process

#### Scenario: Duplicate process upserted

- GIVEN a process `{ proceso: 42, nombre: "Desarrollo" }` exists
- WHEN a process `{ proceso: 42, nombre: "Dev" }` is inserted
- THEN only one record with `proceso: 42` exists
- AND its `nombre` is `"Dev"`

### Requirement: Process Recents Table

The system SHALL store a `processRecents` table in Dexie with index on `proceso`. This table tracks recently used processes for quick access.

#### Scenario: Recently used process tracked

- GIVEN the user selects process `proceso: 42`
- WHEN the recents table is updated
- THEN process `42` is present in `processRecents`

#### Scenario: Recents limited

- GIVEN more than N recently used processes exist
- WHEN the recents list is fetched
- THEN at most N processes are returned (ordered by most recent)

### Requirement: TimeEntry.serverId optional field

The system SHALL support an optional `serverId?: number` field on `TimeEntry`. This field is reserved for future sync functionality and is NOT populated by the migration.

#### Scenario: serverId present in schema

- GIVEN the `timeEntries` table has the `serverId` index
- WHEN a TimeEntry is saved with `serverId: 123`
- THEN the entry is retrievable and `serverId` is `123`

#### Scenario: serverId defaults to undefined

- GIVEN a TimeEntry is saved without `serverId`
- WHEN the entry is retrieved
- THEN `serverId` is `undefined`
