# Proposal: issue-22-search-both-levels

## Intent

ProcessSelector dialog currently lacks search functionality, forcing users to scroll through potentially long lists of projects and processes. Adding real-time search on both levels (projects by name/code, processes by ID/name/ruta) significantly improves usability and navigation speed, especially for databases with hundreds of entries.

## Scope

### In Scope
- Add search input above projects table (filter by NomProy or Proyecto)
- Add search input above processes table (filter by ID, nombre, or ruta)
- Real-time filtering as user types (no debounce needed)
- Clear button on each search input
- Reset search terms when switching views or dialog opens
- Update tests for new functionality

### Out of Scope
- Multi-field advanced search operators
- Search across both levels simultaneously
- Search history or persistence
- Performance optimization beyond useMemo (not needed for expected data sizes)

## Capabilities

### New Capabilities
- `process-selector-search`: Adds real-time search/filter functionality to the two-level ProcessSelector dialog, with independent search terms for each level and case-insensitive partial matching.

### Modified Capabilities
- None

## Approach

Implement using local React state with manual filtering per exploration recommendation:

- Add `useState` for `projectSearchTerm` and `processSearchTerm`
- Place `Input` component from shadcn/ui above each table
- Use `useMemo` to compute `filteredProjects` and `filteredProcesses`
- Filtering logic: case-insensitive partial matches on relevant fields
- Convert numeric IDs to strings for comparison
- Reset both search terms in existing `useEffect` that resets view on dialog open
- Clear buttons use Input component's built-in clear functionality

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `web-ui/src/features/process-management/components/ProcessSelector.tsx` | Modified | Add search inputs, state hooks, memoized filtering, clear buttons |
| `web-ui/src/features/process-management/components/__tests__/ProcessSelector.test.tsx` | Modified | Add tests for search input, filtering behavior, clear functionality |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| State desynchronization between views | Low | Clear both search terms when switching views (already in reset effect) |
| Numeric ID field matching errors | Low | Convert `id` to string before comparison in filter |
| Empty search shows wrong results | Low | Default to showing all rows when search term is empty |
| Performance with large datasets | Low | useMemo prevents unnecessary recalculations; expected data sizes are modest |
| Shadcn Input component not available | Very Low | Already used elsewhere in project; confirmed dependency |

## Rollback Plan

Remove all search-related changes:
- Delete `projectSearchTerm` and `processSearchTerm` state
- Remove `<Input>` components from JSX
- Remove `useMemo` filtering logic, revert to using original arrays
- Remove clearing of search terms from reset effect
- Revert test files to previous state
- No database changes or breaking API changes involved

## Dependencies

- None (self-contained within existing component)

## Success Criteria

- [ ] Search input present above projects table when in projects view
- [ ] Search input present above processes table when in processes view
- [ ] Filtering projects: matches by NomProy OR Proyecto (case-insensitive partial)
- [ ] Filtering processes: matches by ID (as string) OR nombre OR ruta (case-insensitive partial)
- [ ] Clearing search input shows all rows again
- [ ] Switching views resets search terms
- [ ] Opening dialog resets search terms
- [ ] All new functionality covered by unit tests
