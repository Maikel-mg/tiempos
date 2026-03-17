# SQL Generator API

## Purpose

Define the core API for the SQL generator module that works in both browser and Node.js environments.

## Requirements

### Requirement: generateTimeEntrySQL generates valid SQL from array data
The module SHALL accept an array of time entries with task names and generate valid SQL statements for spNETTiempos_Alta.

#### Scenario: Single time entry generates valid SQL
- **WHEN** calling generateTimeEntrySQL with one entry containing valid task mapping
- **THEN** returns SQL statement with correct format: "SET DATEFORMAT dmy; exec spNETTiempos_Alta ..."

#### Scenario: Multiple entries generate batched SQL
- **WHEN** calling generateTimeEntrySQL with multiple entries
- **THEN** returns all SQL statements joined with "GO" separator

#### Scenario: Invalid task mapping returns error
- **WHEN** calling generateTimeEntrySQL with task not in mapping
- **THEN** adds error to errors array with line number

#### Scenario: Invalid duration format throws error
- **WHEN** entry has invalid duration format (not decimal or HH:MM:SS)
- **THEN** throws error with descriptive message

### Requirement: generateTaskSQL creates task/process SQL
The module SHALL generate SQL for spNETTiempos_Procesos_Mantenimiento from task definition.

#### Scenario: Valid task definition generates SQL
- **WHEN** calling generateTaskSQL with valid task definition
- **THEN** returns complete stored procedure call with all parameters

### Requirement: Module works in browser and Node.js
The module SHALL export functions that work in both browser and Node.js environments.

#### Scenario: ESM import works in browser
- **WHEN** importing as ESM module in browser
- **THEN** functions are available and execute correctly

#### Scenario: CJS require works in Node.js
- **WHEN** requiring as CJS module in Node.js
- **THEN** functions are available and execute correctly
