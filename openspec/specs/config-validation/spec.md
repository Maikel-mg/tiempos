## ADDED Requirements

### Requirement: Config validation validates usuario field
The system SHALL validate that the usuario configuration value is a non-empty string before processing.

#### Scenario: Valid usuario passes validation
- **WHEN** the config is loaded with usuario="MG01"
- **THEN** validation succeeds without error

#### Scenario: Empty usuario fails validation
- **WHEN** the config is loaded with usuario="" or usuario=null or usuario=undefined
- **THEN** validation fails with error message "Config error: 'usuario' must be a non-empty string"

### Requirement: Config validation validates tipoHora field
The system SHALL validate that the tipoHora configuration value is a positive integer.

#### Scenario: Valid tipoHora passes validation
- **WHEN** the config is loaded with tipoHora=11
- **THEN** validation succeeds without error

#### Scenario: Invalid tipoHora fails validation
- **WHEN** the config is loaded with tipoHora="invalid" or tipoHora=-1 or tipoHora=0 or tipoHora=null or tipoHora=undefined
- **THEN** validation fails with error message "Config error: 'tipoHora' must be a positive integer"

### Requirement: Config validation validates teletrabajo field
The system SHALL validate that the teletrabajo configuration value is either 0 or 1.

#### Scenario: Valid teletrabajo passes validation
- **WHEN** the config is loaded with teletrabajo=0 or teletrabajo=1
- **THEN** validation succeeds without error

#### Scenario: Invalid teletrabajo fails validation
- **WHEN** the config is loaded with teletrabajo=2 or teletrabajo="yes" or teletrabajo=null or teletrabajo=undefined
- **THEN** validation fails with error message "Config error: 'teletrabajo' must be 0 or 1"

### Requirement: Config validation validates encoding field
The system SHALL validate that the encoding configuration value is a supported Node.js encoding.

#### Scenario: Valid encoding passes validation
- **WHEN** the config is loaded with encoding="utf8"
- **THEN** validation succeeds without error

#### Scenario: Invalid encoding fails validation
- **WHEN** the config is loaded with encoding="invalid-encoding"
- **THEN** validation fails with error message "Config error: 'encoding' must be a valid Node.js encoding (e.g., utf8, latin1)"

### Requirement: Config validation validates archivoTareas field
The system SHALL validate that the archivoTareas configuration value is a non-empty string.

#### Scenario: Valid archivoTareas passes validation
- **WHEN** the config is loaded with archivoTareas="tareas_mapeo.json"
- **THEN** validation succeeds without error

#### Scenario: Invalid archivoTareas fails validation
- **WHEN** the config is loaded with archivoTareas="" or archivoTareas=null or archivoTareas=undefined
- **THEN** validation fails with error message "Config error: 'archivoTareas' must be a non-empty string"

### Requirement: Config validation runs at startup
The system SHALL validate all configuration values immediately after loading the config file and before processing any data.

#### Scenario: Validation runs before CSV processing
- **WHEN** the script starts and loads config.json
- **THEN** all config validations run immediately
- **AND** if any validation fails, the script exits with code 1 and displays the error
- **AND** if all validations pass, the script continues to process the CSV file