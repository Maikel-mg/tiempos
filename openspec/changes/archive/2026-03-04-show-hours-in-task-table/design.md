## Context

The task table currently displays start and end dates for each task but lacks visibility into the total effort (hours) encompassed by the date range. Users need to quickly see how many hours a task represents based on its duration.

## Goals / Non-Goals

**Goals:**
- Display calculated hours in the task table alongside start/end dates
- Calculate hours using standard 8-hour workday (1 day = 8 hours)
- Support the task input form to show calculated hours as user selects dates

**Non-Goals:**
- Not modifying the data model for tasks (dates are already stored)
- Not adding time tracking functionality
- Not supporting custom workday hours per user

## Decisions

1. **Hours calculation in frontend only** - Calculate hours on-the-fly in the UI components rather than storing a separate hours field. This avoids data duplication and ensures hours are always consistent with dates.

2. **Utility function for calculation** - Create a reusable `calculateHours(startDate, endDate)` function that:
   - Takes two Date objects or date strings
   - Returns the difference in days multiplied by 8
   - Handles same-day tasks as 8 hours

3. **Display format** - Show hours as a simple number (e.g., "24 hours", "40 hours") in the table column.

## Risks / Trade-offs

- **Risk**: If dates are stored without time component, timezone issues could cause off-by-one errors → **Mitigation**: Use date-only comparison, ignore time portions
- **Risk**: End date before start date could show negative hours → **Mitigation**: Validate in UI, show 0 or error message
- **Trade-off**: Calculating on every render could impact performance for large tables → **Mitigation**: Memoize calculations or compute once when dates change
