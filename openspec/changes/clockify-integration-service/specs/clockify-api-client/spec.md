## ADDED Requirements

### Requirement: Centralized Authentication
The system SHALL centralize the injection of the `X-Api-Key` header for all Clockify requests.

#### Scenario: Request with API Key
- **WHEN** any Clockify API call is made
- **THEN** the `X-Api-Key` header MUST be present

### Requirement: Error Normalization
The system SHALL map external HTTP error codes to internal domain-specific exceptions.

#### Scenario: Authentication failure
- **WHEN** Clockify returns a 401 Unauthorized
- **THEN** the system SHALL throw a specific "Invalid API Key" error
