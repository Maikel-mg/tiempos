## ADDED Requirements

### Requirement: Task hours display
The system SHALL calculate and display the total hours for each task based on its start and end dates, using a standard 8-hour workday.

#### Scenario: Display hours in task table
- **WHEN** a task has both start and end dates populated
- **THEN** the system displays the calculated hours in a dedicated column, calculated as (endDate - startDate) * 8 hours

#### Scenario: Same day task
- **WHEN** a task has the same start and end date
- **THEN** the system displays 8 hours

#### Scenario: Task without dates
- **WHEN** a task has no start or end date
- **THEN** the system displays no hours (empty cell)

#### Scenario: Hours in task input form
- **WHEN** user selects start and end dates in the task input form
- **THEN** the system displays the calculated hours in real-time as the dates change

#### Scenario: End date before start date
- **WHEN** end date is before start date
- **THEN** the system displays 0 hours or shows an error message
