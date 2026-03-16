## ADDED Requirements

### Requirement: Panel supports collapse/expand state
The panel SHALL support a collapsible state that can be toggled between expanded and collapsed.

#### Scenario: User toggles panel state
- **WHEN** the user clicks the collapse/expand button
- **THEN** the panel SHALL transition between collapsed and expanded states
- **AND** the content SHALL be hidden when collapsed
- **AND** the content SHALL be visible when expanded

### Requirement: Panel shows configuration status indicator when collapsed
The panel SHALL display a visual indicator showing the configuration status when in collapsed state.

#### Scenario: Panel collapsed with saved configuration
- **GIVEN** the database configuration has been saved
- **WHEN** the panel is in collapsed state
- **THEN** the panel SHALL display a "Configurado" indicator

#### Scenario: Panel collapsed without configuration
- **GIVEN** the database configuration has not been saved
- **WHEN** the panel is in collapsed state
- **THEN** the panel SHALL display a "Sin configurar" or similar indicator

### Requirement: Panel state persists during session
The collapse/expand state SHALL persist during the user session.

#### Scenario: User navigates away and returns
- **GIVEN** the user has collapsed the panel
- **WHEN** the user navigates to another step and returns to step 1
- **THEN** the panel SHALL remain in the collapsed state

### Requirement: Panel provides clear toggle control
The panel SHALL provide a clear and accessible control to toggle between collapsed and expanded states.

#### Scenario: User identifies toggle control
- **WHEN** viewing the panel header
- **THEN** the user SHALL be able to identify the collapse/expand control
- **AND** the control SHALL have an appropriate icon indicating the current state

## MODIFIED Requirements

### Requirement: Panel initial state based on configuration existence
The panel SHALL automatically determine its initial state based on whether configuration exists.

#### Scenario: Initial state with existing configuration
- **GIVEN** database configuration has been previously saved
- **WHEN** the step 1 page loads
- **THEN** the panel SHALL start in collapsed state

#### Scenario: Initial state without configuration
- **GIVEN** no database configuration exists
- **WHEN** the step 1 page loads
- **THEN** the panel SHALL start in expanded state
