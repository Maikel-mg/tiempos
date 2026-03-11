## ADDED Requirements

### Requirement: Hidden columns preferences persist across sessions
The system SHALL store the set of hidden columns in localStorage so that user preferences are preserved when the page is reloaded or the browser is closed and reopened.

#### Scenario: Preferences are saved when columns are toggled
- **WHEN** user toggles a column's visibility using the column selector
- **THEN** the system MUST save the updated set of hidden columns to localStorage immediately

#### Scenario: Preferences are loaded on component mount
- **WHEN** the Step3Preview component mounts with a CSV loaded
- **THEN** the system MUST retrieve the saved hidden columns from localStorage
- **AND** the column visibility MUST reflect the saved preferences

### Requirement: Fallback to defaults when stored preferences are invalid
The system SHALL fall back to default hidden columns when the stored preferences cannot be applied to the current CSV.

#### Scenario: Stored columns do not exist in current CSV
- **WHEN** localStorage contains column names that do not exist in the currently loaded CSV headers
- **THEN** the system MUST use only the columns that exist in both the stored set and the current CSV headers
- **AND** any non-existent columns MUST be ignored without causing errors

#### Scenario: localStorage is empty or corrupted
- **WHEN** localStorage does not contain the expected key or contains invalid JSON
- **THEN** the system MUST use the default hidden columns as fallback
- **AND** the system MUST NOT throw errors or crash

### Requirement: Default hidden columns configuration
The system SHALL define a default set of columns that are hidden when no user preferences exist.

#### Scenario: New user with no saved preferences
- **WHEN** a user loads the application for the first time
- **THEN** the following columns MUST be hidden by default: Usuario, Grupo, Correo Electronico, Etiquetas, Facturable

### Requirement: Global preferences across all CSV files
The system SHALL apply the same hidden column preferences to all CSV files, not per-file.

#### Scenario: Different CSV files share preferences
- **WHEN** user loads a different CSV file after setting column preferences
- **THEN** the system MUST apply the same hidden columns configuration to the new CSV
- **AND** columns that exist in both files MUST respect the saved visibility state