# Delta for type-unification

## ADDED Requirements

### Requirement: TimeEntry.taskId is number

The `TimeEntry` interface SHALL define `taskId` as `number` (not `string`). The interface SHALL include an optional `serverId?: number` field.

#### Scenario: TimeEntry with numeric taskId

- GIVEN a `TimeEntry` is created with `taskId: 42`
- WHEN the entry is serialized to IndexedDB
- THEN `taskId` persists as the number `42`

### Requirement: Task type removed

The `Task` interface (`{ id: string; name: string; processId?: string }`) SHALL be removed from `web-ui/src/features/time-tracker/types/index.ts`. All consumers SHALL use `Proceso` (`{ proceso: number; nombre: string }`) from `@/features/projects/types` instead.

#### Scenario: No Task type exported

- GIVEN the time-tracker types module
- WHEN it is imported
- THEN no `Task` interface is exported

### Requirement: TimerState.taskId is number

The `TimerState` interface SHALL define `taskId` as `number`.

#### Scenario: TimerState with numeric taskId

- GIVEN a timer is started with `taskId: 42`
- WHEN `TimerState` is stored in IndexedDB
- THEN `taskId` is the number `42`

### Requirement: TaskSelector consumes Proceso

The `TaskSelector` component SHALL accept and emit `Proceso` (`{ proceso: number; nombre: string }`) instead of `{ id: string; name: string }`.

#### Scenario: TaskSelector onChange emits Proceso

- GIVEN the user selects a process in `TaskSelector`
- WHEN `onChange` fires
- THEN the emitted value has `proceso: number` and `nombre: string`
- AND no `id: string` field is present

### Requirement: TimeEntryForm uses Proceso

The `TimeEntryForm` component SHALL use `Proceso | null` for its task state and pass `taskId: number` to `onSubmit`.

#### Scenario: TimeEntryForm submits numeric taskId

- GIVEN a user fills the form with a selected process
- WHEN the form is submitted
- THEN `onSubmit` receives `taskId` as a `number`

### Requirement: useTasks returns Proceso[]

The `useTasks` hook SHALL return `Proceso[]` (not `Task[]`). The stub implementation may return an empty array.

#### Scenario: useTasks return type

- GIVEN the `useTasks` hook
- WHEN it resolves
- THEN the returned `tasks` array has type `Proceso[]`
