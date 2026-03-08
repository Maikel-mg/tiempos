## Context

The Step 2 wizard displays tasks in a table with columns for task name, dates, hours, and ID. Currently, the table is too narrow - the task name column has `min-w-[300px]` but the overall table container may be constrained. Users have difficulty reading long task names and date columns are cramped.

## Goals / Non-Goals

**Goals:**
- Improve task table readability with better column widths
- Ensure task names are fully visible or have improved truncation
- Make better use of available screen space

**Non-Goals:**
- Adding new functionality to the table
- Changing the data model or how tasks are processed
- Redesigning the overall wizard layout

## Decisions

### Decision 1: Table container width approach

**Option A:** Use fixed pixel widths for columns  
**Option B:** Use flex/percentage-based widths with min-width constraints  
**Option C:** Allow horizontal scroll within the table

**Chosen:** Option B - Use flex-based sizing with increased min-width for task name column. This maintains responsiveness while ensuring readability.

### Decision 2: Task name column width

Current: `min-w-[300px]`  
Proposed: Increase to `min-w-[400px]` or use `flex-1` to take available space

**Chosen:** Use `flex-1` on the task name column to fill available space, combined with improved truncation with tooltip for long names.

## Risks / Trade-offs

- [Risk] Very wide screens might make the table look sparse → Mitigated by max-width constraints
- [Risk] Date columns might still be cramped on small screens → Acceptable trade-off for readability on typical screens
