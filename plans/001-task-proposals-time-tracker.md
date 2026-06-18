# Plan 001: Propuestas de Tarea en el time-tracker desde Procesos Genéricos

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a77cf9f..HEAD -- web-ui/src/domain/proposals/extract-proposals.ts web-ui/src/features/time-tracker/types/index.ts web-ui/src/features/time-tracker/pages/TimeTrackingPage.tsx web-ui/src/features/proposal-ui/components/TaskProposalModal.tsx web-ui/src/features/proposal-ui/components/TaskProposalCard.tsx web-ui/src/config/stores.ts web-ui/src/features/import-csv/services/csv-parser.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: direction (feature)
- **Planned at**: commit `a77cf9f`, 2026-06-18

## Why this matters

Los usuarios del time-tracker arrancan timers contra Procesos Genéricos mensuales (`IPKWEB AAAA-MM. General` / `IPKWEB AAAA-MM. Errores`) para bugs o tareas que creen chicas. Cuando un bug se lleva 2-3 días, el tiempo queda enterrado en el proceso genérico en vez de tener su propia Tarea dedicada para reporting. `LiveTimeEntriesPage` ya resuelve esto para entradas de Clockify vía `extractProposals` + `TaskProposalCard` + `TaskProposalModal`. Este plan trae ese mismo mecanismo al time-tracker, operando sobre las entradas locales (IndexedDB) en vez de las de Clockify, y reasignando las entradas no sincronizadas a la Tarea nueva al aceptar.

## Current state

### Dominio (leer CONTEXT.md — ya actualizado)

Los términos `Proceso Genérico` y `Propuesta de Tarea` ya están en `CONTEXT.md`. Usar esos nombres en código y comentarios. Resumen:

- **Proceso Genérico**: tarea de propósito amplio, creada mensualmente, nombre `IPKWEB AAAA-MM. General` o `IPKWEB AAAA-MM. Errores`.
- **Propuesta de Tarea**: sugerencia de crear una Tarea dedicada desde tiempo acumulado contra un Proceso Genérico, agrupando entradas locales por descripción repetida. Cuando el total supera un umbral de horas, el sistema propone un nombre y permite crear la Tarea.

### Archivos clave

- `web-ui/src/domain/proposals/extract-proposals.ts` — extractor existente para Clockify. Función pura `extractProposals(entries: TimeEntry[], thresholdHours=8): TaskProposal[]`. Regex `GENERIC_TASK_PATTERN` en L18: `/^(?:(\w+)\s+)?(\d{4}-\d{2})\.\s*(General|Errores)$/`. Interfaz `TaskProposal` en L3-16. `parseGenericTask` (L24) extrae `{projectCode, period}` del taskName. **Esta regex y este parser se reusan sin modificar.**
- `web-ui/src/features/proposal-ui/components/TaskProposalCard.tsx` — card reactiva que muestra propuestas. Props: `{proposals: TaskProposal[], onOpenModal: () => void}`. **Se reusa sin modificar.**
- `web-ui/src/features/proposal-ui/components/TaskProposalModal.tsx` — modal editable. Ya usa `useCreateProcess()` (L44) y `SQLPreviewModal` (L190-200) internamente para crear procesos vía el botón ojo. Props: `{open, onOpenChange, proposals, onAccept: (proposal, proposedName, processId) => void, config: ProcessConfig}`. `onAccept` se llama cuando el usuario selecciona un proceso **existente** vía `ProcessSelector` (L88). **Se reusa sin modificar** — el time-tracker solo provee el `onAccept` handler.
- `web-ui/src/features/time-tracker/types/index.ts` — `TimeEntry` local (L24-41). Campo `duration: number` en **segundos** (L33). Campo `synced: boolean` (L38), `syncedAt?`, `syncError?` (L39-40). Campo `taskName: string` (L27), `description?: string` (L34), `taskId: number` (L26), `id: string` (L25), `date: string` (L30), `startTime`/`endTime: string` (L31-32).
- `web-ui/src/features/time-tracker/hooks/useTimeEntries.ts` — hook CRUD. Expone `entries` (L96, todas las entradas), `updateEntry(id, data: Partial<TimeEntry>)` (L55-64). `updateEntry` recalcula `duration` solo si cambian `startTime`/`endTime` (L81-86) — cambiar `taskId`/`taskName` no recalcula duration, que es lo que queremos.
- `web-ui/src/features/time-tracker/pages/TimeTrackingPage.tsx` — página que orquesta. Ya filtra entries por período en `filteredByPeriod` (L58-101, useMemo). Period `'month'` filtra al mes actual (L75-79). **Insertion point**: entre `PeriodProgressPanel` (L472) y el `PeriodSelector` row (L474), o justo después del `PeriodSelector` row antes de `OverlapAlert` (L499).
- `web-ui/src/config/stores.ts` — `proposalConfig` (L53-55): `defineConfig('proposal', { thresholdHours: { type: 'number', default: 8 } })`. **Se reusa sin modificar.**
- `web-ui/src/features/import-csv/services/csv-parser.ts:206-209` — `normalizarHeader`: `.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ')`. **Patrón de normalización a extraer a un util compartido.**
- `web-ui/src/features/process-management/mutations/useCreateProcess.ts` — mutation `POST /api/create-process`. Ya usado por `TaskProposalModal` internamente.
- `server.ts:381-414` — `POST /api/create-process`, ejecuta `buildCreateProcessSQL(dto)` vía `executeStatements`. Devuelve `{success, message, totalRowsAffected, results}`.

### Convenciones del repo (de WEB_ARCHITECTURE.md —matchear)

- Archivos: kebab-case. Componentes React: PascalCase. Hooks: `use*` camelCase.
- `any` prohibido — tipar completamente.
- Máximo 150 líneas por archivo de componente/hook.
- ApiClient para todas las llamadas HTTP (no `fetch` directo).
- Features organizadas como `features/[name]/{components,hooks,queries,mutations}`.
- Errores transitorios: `sonner` toast. Errores persistentes: `Alert` inline.

### Ejemplo de función pura en el mismo dominio (modelo a seguir)

`extract-proposals.ts` es el patrón: función pura, sin I/O, tipada, con interfaz de salida clara. `extractProposalsFromLocal` sigue el mismo estilo.

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Install   | `npm install` (en `web-ui/`)     | exit 0              |
| Typecheck | `npm run type-check` (en `web-ui/`) | exit 0, no errors   |
| Tests     | `npm run test:run` (en `web-ui/`)   | all pass            |

## Scope

**In scope** (the only files you should modify):
- `web-ui/src/lib/normalize.ts` (create) — util de normalización de strings compartido
- `web-ui/src/domain/proposals/extract-proposals.ts` (editar) — extraer `GENERIC_TASK_PATTERN`, `isGenericTask`, `parseGenericTask` a compartido; reusarlos
- `web-ui/src/domain/proposals/extract-local-proposals.ts` (create) — nuevo extractor para entradas locales
- `web-ui/src/features/time-tracker/pages/TimeTrackingPage.tsx` (editar) — computar propuestas, renderizar card+modal, handler de aceptación
- `web-ui/src/domain/proposals/__tests__/extract-local-proposals.test.ts` (create) — tests del nuevo extractor
- `web-ui/src/features/import-csv/services/csv-parser.ts` (editar) — reusar el util de normalize en `normalizarHeader`

**Out of scope** (do NOT touch, even though they look related):
- `web-ui/src/features/proposal-ui/components/TaskProposalCard.tsx` — se reusa sin modificar.
- `web-ui/src/features/proposal-ui/components/TaskProposalModal.tsx` — se reusa sin modificar. Ya maneja la creación de proceso internamente.
- `web-ui/src/features/time-tracker/hooks/useTimeEntries.ts` — no se modifica; el handler de aceptación usa `updateEntry` existente.
- `web-ui/src/config/stores.ts` — `proposalConfig` ya existe; se reusa sin modificar.
- `server.ts` y cualquier archivo del backend — el endpoint `/api/create-process` ya existe.
- `web-ui/src/lib/task-mapping-storage.ts` — decidimos NO guardar mapeo al aceptar (la Tarea nueva queda en la lista del popover para futuros timers).

## Git workflow

- Branch: `advisor/001-task-proposals-time-tracker`
- Commit per step o por unidad lógica; estilo: conventional commits (ej: `feat(time-tracker): add local proposals extraction`, `refactor: extract normalize util`, `test: add extract-local-proposals tests`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Crear util de normalización compartido

Crear `web-ui/src/lib/normalize.ts`:

```typescript
/**
 * Normaliza un string para comparación insensible a mayúsculas, espacios y diacríticos.
 * Usado para agrupar descripciones de entradas que el usuario puede escribir con
 * variaciones de capitalización, espacios extra o acentos.
 */
export function normalizeForMatch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar diacríticos
    .replace(/\s+/g, ' ');           // colapsar espacios múltiples
}
```

**Verify**: `cd web-ui && npm run type-check` → exit 0, no errors.

### Step 2: Extraer regex y parser de Proceso Genérico a compartido

En `web-ui/src/domain/proposals/extract-proposals.ts`:

1. Extraer `GENERIC_TASK_PATTERN`, `isGenericTask`, `parseGenericTask` a un nuevo archivo `web-ui/src/domain/proposals/generic-task.ts`:

```typescript
/** Patrón de nombrado de Procesos Genéricos: `IPKWEB AAAA-MM. General|Errores` */
export const GENERIC_TASK_PATTERN = /^(?:(\w+)\s+)?(\d{4}-\d{2})\.\s*(General|Errores)$/;

export function isGenericTask(taskName: string): boolean {
  return GENERIC_TASK_PATTERN.test(taskName);
}

export function parseGenericTask(taskName: string): { projectCode: string; period: string } {
  const match = taskName.match(GENERIC_TASK_PATTERN);
  if (!match) return { projectCode: '', period: '' };
  return {
    projectCode: match[1] ?? '',
    period: match[2] ?? '',
  };
}
```

2. En `extract-proposals.ts`, reemplazar las definiciones locales con imports:
```typescript
import { GENERIC_TASK_PATTERN, isGenericTask, parseGenericTask } from './generic-task';
```
Mantener el resto del archivo igual.

**Verify**: `cd web-ui && npm run type-check` → exit 0. `cd web-ui && npm run test:run` → tests existentes de `extract-proposals` (si los hay) siguen pasando.

### Step 3: Reusar normalize en csv-parser

En `web-ui/src/features/import-csv/services/csv-parser.ts`, reemplazar el cuerpo de `normalizarHeader` (L206-209) con:
```typescript
import { normalizeForMatch } from '@/lib/normalize';
// ...
export function normalizarHeader(header: string): string {
    return normalizeForMatch(header);
}
```
Verificar que el comportamiento es idéntico (mismo orden de operaciones: trim → lowercase → NFD → diacríticos → espacios).

**Verify**: `cd web-ui && npm run type-check` → exit 0. `cd web-ui && npm run test:run` → tests existentes de csv-parser siguen pasando.

### Step 4: Crear `extractProposalsFromLocal`

Crear `web-ui/src/domain/proposals/extract-local-proposals.ts`:

```typescript
import type { TimeEntry } from '@/features/time-tracker/types';
import type { TaskProposal } from './extract-proposals';
import { isGenericTask, parseGenericTask } from './generic-task';
import { normalizeForMatch } from '@/lib/normalize';

/**
 * Extrae Propuestas de Tarea desde entradas locales del time-tracker.
 *
 * Hermana de `extractProposals` (que opera sobre entradas de Clockify).
 * Esta función opera sobre entradas locales (IndexedDB), donde:
 * - `taskName` es el nombre del Proceso (ej: "IPKWEB 2026-06. Errores")
 * - `description` es texto libre del usuario
 * - `duration` está en SEGUNDOS (no ISO 8601)
 *
 * Agrupa por `proceso genérico + descripción normalizada`, suma horas,
 * y devuelve propuestas para grupos que superan el umbral.
 */
export function extractProposalsFromLocal(
  entries: TimeEntry[],
  thresholdHours: number = 8
): TaskProposal[] {
  // Solo entradas contra Procesos Genéricos
  const genericEntries = entries.filter(e => isGenericTask(e.taskName));

  // Agrupar por proceso genérico + descripción normalizada
  const groups = new Map<string, TimeEntry[]>();
  for (const entry of genericEntries) {
    const key = `${entry.taskName}|||${normalizeForMatch(entry.description ?? '')}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(entry);
  }

  const proposals: TaskProposal[] = [];
  for (const [key, groupEntries] of groups) {
    const [genericTask] = key.split('|||');
    const description = groupEntries[0].description ?? '';

    // duration local está en segundos → convertir a horas
    const totalHours = groupEntries.reduce(
      (sum, e) => sum + (e.duration / 3600),
      0
    );

    if (totalHours <= thresholdHours) continue;

    const { projectCode, period } = parseGenericTask(genericTask);

    // Rango de fechas desde las entries del grupo
    const dates = groupEntries.map(e => e.date).sort();
    const fechaInicio = dates[0] ?? '';
    const fechaFin = dates[dates.length - 1] ?? '';

    proposals.push({
      description,
      genericTask,
      totalHours,
      proposedName: `${projectCode} ${period}. ${description}`,
      projectCode,
      period,
      fechaInicio,
      fechaFin,
      entryCount: groupEntries.length,
      entryIds: groupEntries.map(e => e.id),
      entries: groupEntries.map(e => ({
        id: e.id,
        start: e.date + 'T' + e.startTime,
        end: e.date + 'T' + e.endTime,
        projectId: '',
      })),
      clockifyProjectId: '', // no aplica para entradas locales
    });
  }

  return proposals;
}
```

**Notas de diseño:**
- Devuelve `TaskProposal[]` (mismo tipo que `extractProposals`) para que `TaskProposalCard` y `TaskProposalModal` lo consuman sin cambios.
- `entryIds` se llena con los `id` reales de las entries locales — el handler de aceptación los usa para reasignar.
- `clockifyProjectId: ''` porque las entries locales no tienen projectId de Clockify.

**Verify**: `cd web-ui && npm run type-check` → exit 0, no errors.

### Step 5: Tests para `extractProposalsFromLocal`

Crear `web-ui/src/domain/proposals/__tests__/extract-local-proposals.test.ts`. Modelo a seguir: cualquier test de función pura existente en el repo (input/output, sin mocks).

Casos a cubrir:
1. **Happy path**: 3 entries contra `IPKWEB 2026-06. Errores` con misma descripción `"fix login bug"`, durations que suman 10h (>8 threshold) → 1 propuesta con `totalHours: 10`, `proposedName: "IPKWEB 2026-06. fix login bug"`, `entryCount: 3`.
2. **Bajo umbral**: mismas 3 entries pero durations suman 5h (<8) → 0 propuestas.
3. **No genérico**: entries contra `"IPKWEB 2026-06. Implementación módulo X"` (no matchea regex) → 0 propuestas, aunque sumen 20h.
4. **Descripciones normalizadas**: entries con `"Fix login bug"`, `"fix login bug "`, `"FIX LOGIN BUG"` → se agrupan en una sola propuesta.
5. **Genéricos distintos**: entries con misma descripción pero una contra `General` y otra contra `Errores` → 2 propuestas separadas.
6. **Descripciones distintas**: entries contra mismo `Errores` con `"fix login"` y `"fix logout"` → 2 propuestas separadas.
7. **Umbral custom**: threshold=4, durations suman 5h → 1 propuesta.

Estructura de cada test:
```typescript
import { describe, it, expect } from 'vitest';
import { extractProposalsFromLocal } from '../extract-local-proposals';
import type { TimeEntry } from '@/features/time-tracker/types';

// Helper para construir TimeEntry local con defaults
function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'test-id-' + Math.random(),
    taskId: 100,
    taskName: 'IPKWEB 2026-06. Errores',
    proceso: { proceso: 100, nombre: 'IPKWEB 2026-06. Errores' },
    date: '2026-06-15',
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600, // 1 hora en segundos
    description: 'fix login bug',
    createdAt: '2026-06-15T09:00:00Z',
    updatedAt: '2026-06-15T09:00:00Z',
    synced: false,
    ...overrides,
  };
}
```

**Verify**: `cd web-ui && npm run test:run -- extract-local-proposals` → 7 tests pasan.

### Step 6: Integrar propuestas en TimeTrackingPage

En `web-ui/src/features/time-tracker/pages/TimeTrackingPage.tsx`:

**6a. Imports nuevos** (arriba, después de los imports existentes):
```typescript
import { TaskProposalCard } from '@/features/proposal-ui/components/TaskProposalCard';
import { TaskProposalModal } from '@/features/proposal-ui/components/TaskProposalModal';
import { extractProposalsFromLocal } from '@/domain/proposals/extract-local-proposals';
import { proposalConfig } from '@/config/stores';
import { wizardConfig as wizardConfigStore } from '@/config/stores';
import type { TaskProposal } from '@/domain/proposals/extract-proposals';
```

**6b. Estado de propuestas** (después de los `useState` existentes, ~L38):
```typescript
const [proposalModalOpen, setProposalModalOpen] = useState(false);
```

**6c. Computar propuestas en useMemo** (después de `filteredByPeriod`, ~L101):
```typescript
const proposals = useMemo(() => {
  // Solo entradas del mes actual (consistente con LiveTimeEntriesPage)
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startDay = start.getFullYear() * 10000 + (start.getMonth() + 1) * 100 + start.getDate();
  const endDay = end.getFullYear() * 10000 + (end.getMonth() + 1) * 100 + end.getDate();

  const monthEntries = entries.filter(e => {
    const d = new Date(e.date + 'T12:00:00');
    const entryDay = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return entryDay >= startDay && entryDay <= endDay;
  });

  const threshold = proposalConfig.get()?.thresholdHours ?? 8;
  return extractProposalsFromLocal(monthEntries, threshold);
}, [entries]);
```

**6d. Handler de aceptación** (después de `handleSubmit`, ~L314):
```typescript
const handleAcceptProposal = useCallback(async (
  proposal: TaskProposal,
  _proposedName: string,
  processId: string
) => {
  const newTaskId = Number(processId);
  if (!Number.isFinite(newTaskId) || newTaskId <= 0) {
    toast.error('ID de proceso inválido');
    return;
  }

  // Reasignar solo entries no confirmadas en SQL Server (synced !== true)
  // que pertenezcan a este grupo (mismo genericTask + descripción normalizada)
  const toReassign = entries.filter(e =>
    proposal.entryIds.includes(e.id) && !e.synced
  );

  if (toReassign.length === 0) {
    toast.info('No hay entradas pendientes para reasignar');
    return;
  }

  try {
    for (const entry of toReassign) {
      await updateEntry(entry.id, {
        taskId: newTaskId,
        taskName: proposal.proposedName,
        proceso: { ...entry.proceso, proceso: newTaskId, nombre: proposal.proposedName },
      });
    }
    toast.success(`${toReassign.length} entrada(s) reasignada(s) a "${proposal.proposedName}"`);
  } catch (error) {
    toast.error('Error al reasignar entradas: ' + (error as Error).message);
  }
}, [entries, updateEntry]);
```

**6e. Renderizar card + modal** (insertar dentro de `<div className="px-4 sm:px-6 py-5 space-y-5">`, justo después de `<PeriodProgressPanel>` en L472 y antes del `PeriodSelector` row en L474):
```tsx
{proposals.length > 0 && (
  <TaskProposalCard
    proposals={proposals}
    onOpenModal={() => setProposalModalOpen(true)}
  />
)}

<TaskProposalModal
  open={proposalModalOpen}
  onOpenChange={setProposalModalOpen}
  proposals={proposals}
  onAccept={handleAcceptProposal}
  config={{
    usuario: wizardConfigStore.get()?.usuario ?? '',
    fase: wizardConfigStore.get()?.fase ?? '',
  }}
/>
```

**Notas:**
- `TaskProposalModal` ya maneja la creación de proceso nuevo internamente (eye icon → SQLPreviewModal → `useCreateProcess`). `onAccept` solo se llama cuando el usuario selecciona un proceso **existente** via `ProcessSelector`. En ese caso `processId` es el ID del proceso existente seleccionado, y reasignamos las entries locales a ese proceso. Si el usuario crea un proceso **nuevo** via el eye icon, la creación la maneja el modal; el flujo de reasignación post-creación es un follow-up (ver Maintenance notes).
- `config` se pasa con `usuario` y `fase` del `wizardConfig` — el modal los necesita para el `ProcessSelector` y el `SQLPreviewModal`.

**Verify**: `cd web-ui && npm run type-check` → exit 0. `cd web-ui && npm run test:run` → tests existentes siguen pasando.

### Step 7: Verificación manual (no automatizada, registrar resultado)

1. `npm run web` (frontend) + `npm run dev-backend` (backend) con `.env` configurado.
2. Navegar a `/time-tracker`.
3. Crear 3+ entradas contra un proceso llamado `IPKWEB AAAA-MM. Errores` (donde AAAA-MM es el mes actual) con la **misma descripción**, sumando >8h.
4. Verificar que `TaskProposalCard` aparece mostrando la propuesta.
5. Click en la card → modal se abre, muestra la propuesta con nombre editable.
6. Editar el `proposedName`, click "Seleccionar Proceso", elegir un proceso existente.
7. Verificar que las entradas no-sincronizadas se reasignan (su `taskName` cambia en la UI).
8. Verificar que las entradas `synced: true` **no** se reasignan.

**Registrar**: anotar si la card aparece, si el modal abre, si la reasignación funciona, y si las synced no se mueven.

## Test plan

- **New tests**: `web-ui/src/domain/proposals/__tests__/extract-local-proposals.test.ts` — 7 casos (happy path, bajo umbral, no genérico, normalización, genéricos distintos, descripciones distintas, umbral custom). Modelo: función pura, input/output, sin mocks.
- **Existing tests**: `cd web-ui && npm run test:run` → todos pasan (incluyendo tests de `extract-proposals` existentes si los hay, y `csv-parser` que ahora usa el util compartido).
- **Verification**: `cd web-ui && npm run test:run -- extract-local-proposals` → 7 new tests pasan.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `cd web-ui && npm run type-check` exits 0
- [ ] `cd web-ui && npm run test:run` exits 0; 7 new tests for `extract-local-proposals` exist and pass
- [ ] `grep -rn "parseISO8601Duration\|GENERIC_TASK_PATTERN" web-ui/src/domain/proposals/extract-local-proposals.ts` returns no matches (no duplicación del parser ni de la regex — se importan de compartido)
- [ ] `grep -rn "normalizeForMatch" web-ui/src/features/import-csv/services/csv-parser.ts` returns 1 match (csv-parser reusa el util)
- [ ] `grep -rn "extractProposalsFromLocal" web-ui/src/features/time-tracker/pages/TimeTrackingPage.tsx` returns 1+ matches
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts (the codebase has drifted since this plan was written).
- `TimeTrackingPage.tsx` already has proposal-related code (alguien ya agregó propuestas al time-tracker).
- `TaskProposalModal`'s `onAccept` signature changed (ya no es `(proposal, proposedName, processId) => void`).
- The local `TimeEntry` type in `types/index.ts` no longer has `synced: boolean` or `duration: number` (campos renombrados o removidos).
- `proposalConfig` in `stores.ts` no longer exists or no longer has `thresholdHours`.
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file.

## Maintenance notes

Para el humano/agent que mantiene este código después:

- **Follow-up: reasignación post-creación de proceso nuevo.** Hoy, si el usuario crea un proceso **nuevo** via el eye icon del `TaskProposalModal` (path `useCreateProcess` → `SQLPreviewModal`), el `onAccept` no se llama y las entries locales **no se reasignan automáticamente**. El usuario tiene que re-abrir el modal y seleccionar el proceso recién creado. Para cerrar este gap, habría que: (a) hacer que `TaskProposalModal` exponga un callback `onProcessCreated(newProcessId)`, o (b) que el modal llame `onAccept` después de una creación exitosa. Es un follow-up porque requiere modificar `TaskProposalModal` (out of scope de este plan).
- **Quées interactúa con esto:** si se cambia la forma de `TimeEntry` local (campos `duration`, `synced`, `taskName`), `extractProposalsFromLocal` y el handler de aceptación se rompen. Si se cambia la convención de nombrado de Procesos Genéricos (dejar de usar `IPKWEB AAAA-MM.`), la regex compartida `GENERIC_TASK_PATTERN` deja de matchear — actualizarla en `generic-task.ts` actualiza ambos extractores.
- **Qué mirar en review:** que el `useMemo` de propuestas no se compute en cada render innecesariamente (depende solo de `entries`); que el handler no reasigne entries `synced: true`; que el `proposedName` siga la convención `IPKWEB AAAA-MM. ${description}`.
- **Follow-up diferido:** integrar `phaseByMonthConfig` en el time-tracker para que la fase sugerida mensual se pre-llene al crear una Tarea nueva desde una propuesta (hoy el modal usa `wizardConfig.fase` que puede estar desactualizada para el mes).
