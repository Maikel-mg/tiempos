## ADDED Requirements

### Requirement: totalRows returns row count from CSV data
The wizard SHALL expose total row count from parsed CSV data.

- **WHEN** parsed CSV data exists
- **THEN** totalRows equals the number of data rows
- **WHEN** no CSV data has been uploaded
- **THEN** totalRows equals 0

### Requirement: uniqueTasks returns count of unique task names
The wizard SHALL expose count of unique tasks extracted from CSV.

- **WHEN** tasks have been extracted from CSV
- **THEN** uniqueTasks equals the number of unique task names
- **WHEN** no CSV has been uploaded
- **THEN** uniqueTasks equals 0

### Requirement: mappedTasks returns count of successfully mapped tasks
The wizard SHALL expose count of tasks that have valid IDs assigned.

- **WHEN** tasks exist with valid IDs (positive integers)
- **THEN** mappedTasks equals the count of such tasks
- **WHEN** no tasks or no valid mappings
- **THEN** mappedTasks equals 0

### Requirement: progress returns mapping completion percentage
The wizard SHALL expose progress as percentage of tasks mapped.

- **WHEN** uniqueTasks > 0
- **THEN** progress equals round((mappedTasks / uniqueTasks) * 100)
- **WHEN** uniqueTasks equals 0
- **THEN** progress equals 0

### Requirement: isFullyMapped indicates complete mapping
The wizard SHALL expose boolean indicating all tasks are mapped.

- **WHEN** uniqueTasks > 0 AND mappedTasks equals uniqueTasks
- **THEN** isFullyMapped equals true
- **WHEN** uniqueTasks equals 0
- **THEN** isFullyMapped equals false
- **WHEN** any task is unmapped or invalid
- **THEN** isFullyMapped equals false