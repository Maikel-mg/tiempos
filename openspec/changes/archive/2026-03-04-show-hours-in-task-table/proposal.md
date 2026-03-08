## Why

Currently, the task table displays start and end dates for each task, but users cannot quickly see the total hours encompassed by the task period. This makes it difficult to estimate effort and plan resources effectively.

## What Changes

- Add hour calculation display in the task table showing total hours for each task's date range
- Display hours based on a standard 8-hour workday (1 day = 8 hours)
- Show the calculated hours in a new column alongside the existing date fields
- Support both display in the table and in the task input form

## Capabilities

### New Capabilities
- `task-hours-display`: Capability to calculate and display total hours based on task start and end dates, using 8 hours per day

### Modified Capabilities
- None

## Impact

- UI component modifications in the task table view
- Task input form enhancement
- Date calculation utility function needed
