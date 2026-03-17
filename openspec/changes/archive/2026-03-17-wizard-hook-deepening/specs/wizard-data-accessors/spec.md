## ADDED Requirements

### Requirement: getTasks returns clean task objects
The wizard SHALL expose tasks via accessor function returning structured objects.

- **WHEN** calling getTasks()
- **THEN** returns array of Task objects
- **AND** each Task has: name, assignedId, isSuggested, summary

#### Scenario: Task with ID assigned
- **WHEN** task has valid mapping
- **THEN** Task.name equals the task name
- **AND** Task.assignedId equals the mapped ID
- **AND** Task.isSuggested indicates if from storage
- **AND** Task.summary contains: startDate, endDate, totalMinutes

#### Scenario: Task without ID
- **WHEN** task has no mapping
- **THEN** Task.assignedId equals null

#### Scenario: No tasks available
- **WHEN** no CSV has been uploaded
- **THEN** getTasks() returns empty array

### Requirement: getSqlResult returns SQL generation result
The wizard SHALL expose SQL result via accessor function.

- **WHEN** calling getSqlResult()
- **THEN** returns null if no SQL has been generated
- **AND** returns object with: sql, statements, stats when available
- **AND** stats contains: processed count, error count

#### Scenario: SQL generated successfully
- **WHEN** generateSQL completed successfully
- **THEN** getSqlResult().sql contains complete SQL string
- **AND** getSqlResult().statements contains individual statements
- **AND** getSqlResult().stats.processed equals row count
- **AND** getSqlResult().stats.errors equals error count

#### Scenario: No SQL generated yet
- **WHEN** generateSQL has not been called
- **THEN** getSqlResult() returns null

### Requirement: _raw exposes full state for edge cases
The wizard SHALL expose full internal state for advanced use cases.

- **WHEN** accessing _raw property
- **THEN** returns object with: csvData, taskMapping, config, selectedRows
- **AND** includes setters: setSelectedRows, updateConfig

#### Scenario: Component needs row selection
- **WHEN** calling _raw.setSelectedRows([0, 2, 4])
- **THEN** only those rows are included in SQL generation
- **AND** calling generateSQL respects the selection