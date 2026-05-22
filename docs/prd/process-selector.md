## Problem Statement

En la página LiveTimeEntriesPage, los usuarios deben asignar un ID interno de tarea a cada nombre de tarea Clockify que aparece en sus entradas de tiempo. Actualmente esto se hace mediante un input manual donde el usuario teclea el ID. Este flujo es propenso a errores (ID incorrectos, tareas duplicadas sin ID) y no permite visualizar qué tareas internas ya existen en el sistema para facilitar la selección.

El objetivo es reemplazar el input manual por un selector visual en dos niveles (proyecto → proceso/tarea) que permita buscar, navegar con teclado y autocompletar el ID, todo dentro de un popup accesible desde la columna "ID de Proceso" de ProcessMappingTable.

## Solution

Un componente `ProcessSelector` (Popup/Dialog) que se abre al hacer click/focus en el input de ID de una fila. Muestra:

1. **Nivel 1 — Selector de proyecto**: Tabla con buscador que muestra todos los proyectos disponibles (nombre + código). Navegación con flechas + Enter para seleccionar.

2. **Nivel 2 — Selector de proceso**: Al seleccionar un proyecto, muestra la lista de todos los procesos de ese proyecto en tabla plana con buscador. Columnas: ID | Proceso | Ruta (Disciplina / Fase). Navegación con flechas + Enter para seleccionar proceso. Botón "Volver" para regresar al nivel 1.

Al seleccionar un proceso, el ID se autocompleta en el input y el popup se cierra. El usuario puede limpiar el valor con el botón X (con confirmación) o con Escape (con confirmación).

## User Stories

1. As a user, I want to see a list of available projects in a searchable table, so that I can select the correct project for the task I'm assigning.
2. As a user, I want to search projects by name or code, so that I can find the project quickly even if I don't know the exact name.
3. As a user, I want to navigate the project list with keyboard (arrows + Enter), so that I don't need to use the mouse to select a project.
4. As a user, I want to see all processes of the selected project in a flat table, so that I can find the exact task I need to assign.
5. As a user, I want to search processes by name, ID, or route (Disciplina/Fase), so that I can locate the right process without navigating a tree.
6. As a user, I want to navigate the process table with keyboard (arrows + Enter), so that I can select a process without using the mouse.
7. As a user, I want to press Enter on a process to autocomplete the ID and close the popup, so that the workflow is fast.
8. As a user, I want to press Escape to go back from level 2 to level 1 (project list), so that I can change the project if I selected the wrong one.
9. As a user, I want to press Escape to close the popup without selecting anything at level 1, so that I can cancel the action.
10. As a user, I want to click the X button to clear the assigned ID, so that I can reset the mapping if I made a mistake.
11. As a user, I want to confirm before clearing the ID (via X or Escape when input has value), so that I don't accidentally lose my work.
12. As a user, I want the popup to always start at level 1 when opened, so that the behavior is predictable.
13. As a user, I want to see a loading state while the process list is being fetched, so that I know the app is working.
14. As a user, I want to keep typing in the input manually as a fallback, so that I can still assign IDs that aren't in the project tree.
15. As a user, I want to see the current assigned ID in the input, so that I know which process is currently mapped.
16. As a user, I want to click on the input to change the assigned ID, so that I can update a mapping without having to clear it first.
17. As a user, I want to see the placeholder "Seleccionar ID..." when the input is empty, so that I know the field is interactive.
18. As a user, I want to hover the input to see the X button appear, so that the UI is clean when idle.
19. As a user working in ProcessMappingTable, I want only one popup open at a time, so that the UI doesn't become confusing with multiple dialogs.

## Implementation Decisions

### Modules to build

1. **`ProcessSelector` component** — New component that replaces the `<Input type="text">` in ProcessMappingTable for task ID selection. Self-contained, manages its own open/close state, project list, and process tree fetching.

   Interface:
   ```typescript
   interface ProcessSelectorProps {
     value: string;           // current ID (empty string = unassigned)
     onChange: (id: string) => void;
   }
   ```

2. **`useProjects`** (existing, reused) — Already exists at `@/features/projects/hooks/use-projects`. Used to fetch the project list for level 1.

3. **`useProjectTree`** (existing, reused) — Already exists at `@/features/projects/hooks/use-project-tree`. Used to fetch the process tree for level 2. Needs to be flattened into a table.

4. **Flattening logic** — The ProjectTree hierarchy (Disciplina → Fase → Proceso) needs to be flattened into a simple list for the level 2 table. This logic lives inside ProcessSelector.

### Interaction design

- **Input behavior**: The input shows the current ID value. When clicked (or Enter/Space pressed), opens the popup. When hovering with a value assigned, shows an X button to clear (with confirmation). Escape also triggers clear confirmation.

- **Popup layout**: Dialog with two views controlled by internal state `view: 'projects' | 'processes'`. Projects view shows a table with columns: Cliente | Proyecto | Código. Processes view shows a header with project name + "Volver" button, plus a table with columns: ID | Proceso | Ruta.

- **Keyboard navigation**:
  - Input: Enter/Space → open popup
  - Input: Escape → confirm clear
  - Popup level 1: Arrows navigate rows, Enter selects and goes to level 2, Escape closes
  - Popup level 2: Arrows navigate rows, Enter selects and closes, Escape goes back to level 1

- **Confirmation for clear**: Uses `window.confirm()` native browser dialog. Confirmation appears when user clicks X or presses Escape while input has a value.

- **Loading state**: While `useProjectTree` is fetching, show "Cargando procesos..." message in the process table area.

- **Reset on close**: Every time the popup closes (regardless of whether something was selected or not), the internal view resets to 'projects'.

### Data flow

1. Component mounts → uses `useProjects()` to fetch project list (cached via React Query)
2. User selects project → internal state `selectedProject` updated, `useProjectTree` triggered with `{ codCli, proyecto }`
3. Process table shows flattened list from `data.disciplinas[].fases[].procesos[]`
4. User clicks process → `onChange(process.proceso)` called, popup closes
5. ProcessMappingTable receives `onChange` and updates `taskMapping`

### Edge cases

- If `useProjects` returns empty list, show "No hay proyectos"
- If `useProjectTree` returns empty disciplinas, show "No hay procesos"
- If network error, show error message in popup
- If a row already has a value and user opens popup but doesn't select anything, the existing value is preserved (no change)

## Testing Decisions

### What makes a good test

Tests verify external behavior only — not internal state or implementation details. For ProcessSelector, tests should verify:

- Clicking the input opens the popup
- Popup shows project list when opened
- Selecting a project navigates to process list
- Selecting a process closes the popup and calls onChange with correct ID
- Escape on level 2 goes back to level 1
- Escape on level 1 closes the popup
- X button triggers confirmation dialog
- Confirming X clears the value and calls onChange with empty string
- Cancelling X preserves the value
- Keyboard navigation (arrows + Enter) works on both levels

### Modules to test

- `ProcessSelector` component — render with mocked `useProjects` and `useProjectTree`, verify UI states, test interactions with user events
- Flattening logic — pure function that transforms `ProjectTreeResponse` into flat `ProcessRow[]`, test with various tree shapes

### Prior art

The codebase already has similar patterns in `ProjectsTable.tsx` (project list with row click navigation) and `ProcessMappingTable.tsx` (input in table cell). Tests can follow the approach used in those components.

## Out of Scope

- Modifying the SQL generation logic — the ID assignment flow change does not affect how SQL is generated
- Changes to how task mappings are persisted — `task-mapping-storage.ts` continues to work as-is
- Adding a "create new project" flow — only selection, not creation
- Editing ProcessMappingTable filters, search, or expand/collapse behavior — those remain unchanged
- Changes to `TaskMappingTable.tsx` (the other similar component in `src/components/`) — this PRD targets only `ProcessMappingTable` in `src/features/process-management/`

## Further Notes

This feature replaces manual text input with a guided two-step selector. The fallback to manual input remains available if the user needs an ID not present in the project tree. The implementation keeps `ProcessMappingTable` largely unchanged — only the `<Input>` in the ID column is replaced with `<ProcessSelector>`.

PRD generated from grill session on 2026-05-21.