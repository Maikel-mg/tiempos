## ADDED Requirements

### Requirement: Database configuration panel supports collapse/expand
The database configuration panel in step 1 SHALL support collapse and expand functionality to optimize screen space usage.

#### Scenario: User collapses configuration panel
- **GIVEN** the database configuration panel is expanded
- **WHEN** the user clicks the collapse button
- **THEN** the panel SHALL collapse to show only the header
- **AND** the configuration form fields SHALL be hidden

#### Scenario: User expands configuration panel
- **GIVEN** the database configuration panel is collapsed
- **WHEN** the user clicks the expand button
- **THEN** the panel SHALL expand to show all configuration fields
- **AND** the user SHALL be able to edit the configuration

### Requirement: Configuration panel shows status when collapsed
The database configuration panel SHALL display the current configuration status when collapsed.

#### Scenario: View configuration status
- **GIVEN** the database configuration panel is collapsed
- **WHEN** the user views the panel header
- **THEN** the panel SHALL display whether configuration is saved or not
- **AND** the status SHALL be clearly visible

### Requirement: Configuration panel has appropriate initial state
The database configuration panel SHALL automatically determine its initial expanded/collapsed state based on the existence of saved configuration.

#### Scenario: Panel loads with existing configuration
- **GIVEN** database connection parameters have been saved
- **WHEN** step 1 loads
- **THEN** the panel SHALL be collapsed by default
- **AND** a "Configurado" indicator SHALL be visible

#### Scenario: Panel loads without configuration
- **GIVEN** no database configuration exists
- **WHEN** step 1 loads
- **THEN** the panel SHALL be expanded by default
- **AND** the configuration form fields SHALL be visible and editable
