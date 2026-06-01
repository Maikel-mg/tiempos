# Proposal: Unify TimeEntry type, IndexedDB schema bump & migration runner

## Intent

The `TimeEntry.taskId` field is `string` but the canonical `Proceso` entity uses numeric `proceso: number`. The Dexie schema is at version 1 with no process cache or sync tracking. This creates a type mismatch between the time-tracker and the SQL Server domain model, and blocks future sync flows that need `serverId` and sync status per entry.

## Scope

### In Scope
- `TimeEntry.taskId` → `number`; add `TimeEntry.serverId?: number`
- Remove `Task` type; selectors/forms consume `Proceso` (`{ proceso: number; nombre: string }`)
- Dexie schema v2: `processes` table, `processRecents` table, `synced` index on `timeEntries`
- Migration runner in `onupgradeneeded`: parse `taskId: string` → `number`; discard entries where value is not a finite positive integer
- One-time warning toast if entries were discarded during migration
- Migration is idempotent — running twice does not duplicate or corrupt rows

### Out of Scope
- Actual sync logic consuming `serverId` (future feature)
- Remote API for process list (the `useTasks` hook stays stubbed; process list comes from `ProjectTreeProceso`)
- Changes to backend or SQL generation logic

## Capabilities

### New Capabilities
- `indexeddb-migration`: Dexie schema bump, onupgradeneeded runner, toast warning on discard, idempotency
- `process-cache`: Dexie `processes` table + `processRecents` table for offline process lookup

### Modified Capabilities
- None. No existing spec covers time-tracker types or IndexedDB.

## Approach

1. **Type changes** in `web-ui/src/features/time-tracker/types/index.ts`:
   - `TimeEntry.taskId: number`; add `serverId?: number`
   - Remove `Task` interface; add `Proceso` re-export from `@/features/projects/types`

2. **Dexie schema v2** in `web-ui/src/lib/storage/IndexedDBStorage.ts`:
   - `this.version(2).stores({ timeEntries: 'id, taskId, date, startTime, endTime, synced, createdAt, serverId', processes: 'proceso, nombre', processRecents: 'proceso' })`
   - Migration in `onupgradeneeded`: iterate `timeEntries`, parse `taskId` string → number; delete entries that fail `Number.isFinite(v) && v > 0 && Number.isInteger(v)`; set a `_migrationDiscarded` flag in a transient store or return count
   - On first app load after upgrade, check a `migrationMeta` table for discard count; show toast if > 0; mark as warned

3. **Cascade updates** to consumers:
   - `timeTrackingService.ts`: `createEntry` param `taskId` becomes `number`
   - `TaskSelector.tsx`: accept `Proceso` (`{ proceso: number; nombre: string }`) instead of `{ id: string; name: string }`
   - `TimeEntryForm.tsx`: task state becomes `Proceso | null`; submit passes `taskId: number`
   - `useTasks.ts`: return `Proceso[]` from project tree (or remain stubbed with numeric IDs)
   - `TimerState.taskId` → `number`

4. **Unit tests**: empty DB migration, valid string→number conversion, invalid string discarded, idempotency, version mismatch does not re-run

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `web-ui/src/features/time-tracker/types/index.ts` | Modified | `TimeEntry.taskId: number`, `serverId`, remove `Task` |
| `web-ui/src/lib/storage/IndexedDBStorage.ts` | Modified | Schema v2, migration runner, `processes`/`processRecents` tables |
| `web-ui/src/features/time-tracker/services/timeTrackingService.ts` | Modified | `taskId` param → `number` |
| `web-ui/src/features/time-tracker/components/TaskSelector.tsx` | Modified | Consume `Proceso` instead of `Task` |
| `web-ui/src/features/time-tracker/components/TimeEntryForm.tsx` | Modified | Task state → `Proceso \| null` |
| `web-ui/src/features/time-tracker/hooks/useTasks.ts` | Modified | Return `Proceso[]` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Users lose entries if migration parses incorrectly | Low | Conservative parse: only accept finite positive integers; discard rest with toast |
| Dexie version bump causes data loss on downgrade | Low | Downgrade is unsupported by design; document in release notes |
| `taskId: number` breaks SQL generation | Low | `sql-generator` already uses `validarIdProceso` which accepts `number`; no changes needed there |

## Rollback Plan

IndexedDB schema v2 is a one-way migration. Rollback = revert code, let Dexie re-create v1 database (loses all cached data). Mitigation: the time-tracker cache is ephemeral by design; users re-sync from Clockify.

## Dependencies

- `@/features/projects/types` (`ProjectTreeProceso`) already exists — no new dependency

## Success Criteria

- [ ] `TimeEntry.taskId` is `number`; `TimeEntry.serverId?` exists
- [ ] `Task` type removed; all selectors/forms use `Proceso`
- [ ] Dexie schema version = 2 with `processes`, `processRecents`, `synced` index
- [ ] Migration converts valid string→number, discards invalid, shows toast
- [ ] Migration is idempotent (running twice = same result)
- [ ] Unit tests pass for all migration scenarios
- [ ] `tsc --noEmit` passes with no `any` / unsafe casts
