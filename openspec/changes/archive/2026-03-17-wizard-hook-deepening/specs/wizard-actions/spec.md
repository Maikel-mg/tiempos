## ADDED Requirements

### Requirement: uploadFile parses CSV and prepares wizard state
The wizard SHALL accept a file upload, parse the CSV, extract unique tasks, and auto-map tasks from storage.

#### Scenario: Valid CSV file upload
- **WHEN** calling uploadFile with a valid .csv or .txt file
- **THEN** parses the CSV using configured encoding
- **THEN** extracts unique tasks from the data
- **THEN** auto-maps tasks from localStorage suggestions
- **THEN** transitions step to 'mapping'

#### Scenario: Invalid file type
- **WHEN** calling uploadFile with a non-CSV file
- **THEN** throws error: "El archivo debe ser CSV (.csv o .txt)"
- **THEN** sets error state with the message

#### Scenario: Missing required columns
- **WHEN** calling uploadFile with CSV missing required columns
- **THEN** throws error: "Columnas requeridas no encontradas: ..."
- **THEN** sets error state with the column names

#### Scenario: CSV parsing error
- **WHEN** calling uploadFile with malformed CSV
- **THEN** propagates parsing error to error state
- **THEN** isLoading is set to false

### Requirement: setTaskId updates mapping and persists to storage
The wizard SHALL update a task's ID mapping and persist valid mappings to localStorage.

#### Scenario: Valid task ID assignment
- **WHEN** calling setTaskId with valid ID (positive integer string)
- **THEN** updates the task mapping
- **THEN** persists the mapping to localStorage
- **THEN** marks task as suggested

#### Scenario: Empty task ID
- **WHEN** calling setTaskId with empty string
- **THEN** updates the task mapping to empty string
- **THEN** does NOT persist to localStorage

#### Scenario: Invalid task ID format
- **WHEN** calling setTaskId with non-numeric string
- **THEN** still updates the mapping (validation happens on generate)
- **THEN** does NOT persist to localStorage

### Requirement: generateSQL validates and produces SQL
The wizard SHALL validate all task mappings and generate SQL if valid.

#### Scenario: All tasks mapped with valid IDs
- **WHEN** calling generateSQL and all tasks have valid IDs
- **THEN** converts string IDs to integers
- **THEN** generates SQL using sql-generator
- **THEN** transitions step to 'preview'

#### Scenario: Some tasks without IDs
- **WHEN** calling generateSQL and some tasks have empty IDs
- **THEN** throws error: "X tarea(s) sin ID asignado"
- **THEN** error state is set, step does not change

#### Scenario: Some tasks with invalid IDs
- **WHEN** calling generateSQL and some tasks have non-numeric IDs
- **THEN** throws error: "X ID(s) inválido(s)"
- **THEN** error state is set, step does not change

### Requirement: goToStep navigates with validation
The wizard SHALL allow navigation between steps with appropriate validation.

#### Scenario: Navigate to step 1 (reset)
- **WHEN** calling goToStep('upload')
- **THEN** resets all data state
- **THEN** transitions step to 'upload'

#### Scenario: Navigate to step 2 (from step 1)
- **WHEN** calling goToStep('mapping') with csvData present
- **THEN** transitions step to 'mapping'
- **THEN** clears sqlResult and error

#### Scenario: Navigate to step 3 (from step 2)
- **WHEN** calling goToStep('preview') with sqlResult present
- **THEN** transitions step to 'preview'
- **THEN** clears error

### Requirement: reset clears all wizard state
The wizard SHALL reset to initial empty state.

- **WHEN** calling reset
- **THEN** clears all data state (csvData, tasks, taskMapping, sqlResult)
- **THEN** resets step to 'upload'
- **THEN** clears error and loading states