## Context

Currently, the application fetches time entries from Clockify using raw HTTP calls in `server.js`. The resulting data is then manually parsed in the frontend. This creates a brittle dependency on Clockify's JSON structure across layers. We are moving to a "Deep Module" architecture where Clockify logic is encapsulated and normalized before being exposed to the rest of the application.

## Goals / Non-Goals

**Goals:**
- Provide a clean, minimal API: `getNormalizedEntries(criteria)`.
- Isolate Clockify's API quirks (ISO8601 parsing, nested objects) from the core domain.
- Implement a Ports & Adapters architecture to allow for easy mocking and future-proofing.
- Ensure the transformation logic is pure and unit-testable.

**Non-Goals:**
- Implementing a full Clockify dashboard or feature-set (only what the app needs).
- Changing the existing UI layout (only the data fetching mechanism).

## Decisions

### 1. Minimal Public Interface
**Decision**: The service will expose only 2-3 high-level methods: `getWorkspaces()` and `getNormalizedEntries(criteria)`.
**Rationale**: Keeps the module "Deep" by hiding the implementation details of pagination, API selection (Reports vs v1), and normalization.

### 2. Ports & Adapters Architecture
**Decision**: Use separate "Adapters" for HTTP communication and a core "Domain Logic" for normalization.
**Rationale**: Decouples the normalization math (e.g., PT1H30M -> 90 mins) from the network transport. Allows testing the transformation with mock data.

### 3. Normalization into a Standard "TimeEntry" Model
**Decision**: Every external record will be converted into a flat, predictable `NormalizedTimeEntry` object.
**Rationale**: This creates a stable contract for the UI and the SQL generator, shielding them from external schema changes.

## Risks / Trade-offs

- **[Risk] Data Loss in Normalization** → **Mitigation**: Include a `raw` field in the normalized object as an escape hatch for unforeseen UI needs.
- **[Risk] Increased Boilerplate** → **Mitigation**: Use a simple functional approach within the module to keep the number of files manageable while maintaining the conceptual separation.
- **[Risk] Breaking Existing Flows** → **Mitigation**: Implement the service in parallel with the existing logic and migrate the UI incrementally.
