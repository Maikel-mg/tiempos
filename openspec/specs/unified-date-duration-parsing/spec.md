# Unified Date/Duration Parsing

## Purpose

Define utilities for parsing and formatting dates, durations, and validating SQL-safe input.

## Requirements

### Requirement: Parse ISO 8601 duration to minutes
The module SHALL convert ISO 8601 duration format (PT1H30M) to total minutes.

#### Scenario: ISO 8601 hours and minutes
- **WHEN** parsing "PT1H30M"
- **THEN** returns 90 minutes

#### Scenario: ISO 8601 with seconds rounding
- **WHEN** parsing "PT1H30M45S"
- **THEN** returns 91 minutes (rounds up at 30 seconds)

#### Scenario: ISO 8601 with only minutes
- **WHEN** parsing "PT45M"
- **THEN** returns 45 minutes

### Requirement: Parse decimal hours to minutes
The module SHALL convert decimal hours format to minutes.

#### Scenario: Decimal hours with dot
- **WHEN** parsing "1.5"
- **THEN** returns 90 minutes

#### Scenario: Decimal hours with comma
- **WHEN** parsing "1,5"
- **THEN** returns 90 minutes

### Requirement: Parse HH:MM:SS duration to minutes
The module SHALL convert time duration format to minutes.

#### Scenario: HH:MM:SS format
- **WHEN** parsing "01:30:00"
- **THEN** returns 90 minutes

#### Scenario: HH:MM:SS with seconds rounding
- **WHEN** parsing "01:30:45"
- **THEN** returns 91 minutes

### Requirement: Format ISO date to SQL date
The module SHALL convert ISO 8601 date to DD/MM/YYYY format.

#### Scenario: ISO date conversion
- **WHEN** converting "2024-01-15T09:00:00Z"
- **THEN** returns "15/01/2024"

### Requirement: Format ISO time to SQL time
The module SHALL convert ISO 8601 time to HH:MM:SS format.

#### Scenario: ISO time conversion
- **WHEN** converting "2024-01-15T09:30:00Z"
- **THEN** returns "09:30:00"

### Requirement: Validate SQL injection patterns
The module SHALL reject input containing dangerous SQL patterns.

#### Scenario: Reject SQL comment
- **WHEN** input contains "--"
- **THEN** throws error with "caracteres no permitidos"

#### Scenario: Reject DROP statement
- **WHEN** input contains "DROP TABLE"
- **THEN** throws error

#### Scenario: Single quotes are escaped
- **WHEN** input contains single quote
- **THEN** quote is doubled for escaping (" becomes '')
