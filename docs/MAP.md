# MAP — De concepto a archivo

Índice de navegación para agentes. Da el archivo de entrada de cada concepto; no es un
inventario exhaustivo. Rutas relativas a la raíz del repo.

> Los tests viven junto al código, en `__tests__/` dentro de la carpeta correspondiente.

## Backend (raíz)

| Concepto | Archivo |
|----------|---------|
| API HTTP (endpoints, conexión, ejecución SQL) | `server.ts` |
| Generación de SQL / stored procedures | `src/application/sp-builder.ts` |
| Ejecución de SQL contra SQL Server | `src/application/sql-executor.ts` |
| Clasificación de entradas (`alreadyExists` / `willInsert`) | `src/application/entry-classifier.ts` |
| Parseo de fechas | `src/domain/date-parser.ts` |
| Configuración de conexión a BD | `src/domain/db-config.ts` |
| Transformación del árbol de proyectos | `src/domain/tree-transformer.ts` |

## Frontend — núcleo (time-tracker)

| Concepto | Archivo |
|----------|---------|
| Página del time tracker (composición de hooks y componentes; 300 líneas, desde ~870) | `web-ui/src/features/time-tracker/pages/TimeTrackingPage.tsx` |
| Filtro de período (hook) | `web-ui/src/features/time-tracker/hooks/usePeriodFilter.ts` |
| Editor de registros y CRUD (hook) | `web-ui/src/features/time-tracker/hooks/useEntryEditor.ts` |
| Vista del Timer activo (hook) | `web-ui/src/features/time-tracker/hooks/useTimerView.ts` |
| Flujo de dividir un Registro y el timer (hook) | `web-ui/src/features/time-tracker/hooks/useSplitFlow.ts` |
| Sincronización de Registros (hook) | `web-ui/src/features/time-tracker/hooks/useEntrySync.ts` |
| Propuestas de tarea (hook) | `web-ui/src/features/time-tracker/hooks/useProposals.ts` |
| Selección de filas (hook) | `web-ui/src/features/time-tracker/hooks/useEntrySelection.ts` |
| Navegación por teclado de la tabla (hook) | `web-ui/src/features/time-tracker/hooks/useEntryTableNavigation.ts` |
| Acciones del command palette (hook) | `web-ui/src/features/time-tracker/hooks/useTimeTrackerCommandActions.tsx` |
| Timer activo (estado y ciclo de vida) | `web-ui/src/features/time-tracker/hooks/useTimer.ts` |
| Lógica pura del timer en curso | `web-ui/src/features/time-tracker/lib/runningTimer.ts` |
| Barra del timer / fila del timer | `web-ui/src/features/time-tracker/components/TimeTrackerBar.tsx`, `TimerRow.tsx` |
| Lista de entradas de tiempo | `web-ui/src/features/time-tracker/components/TimeEntryList.tsx`, `TimeEntryRow.tsx` |
| Editor de registros (crear/editar) | `web-ui/src/features/time-tracker/components/TimeEntryEditorDialog.tsx` |
| Dividir entradas (split) — lógica | `web-ui/src/features/time-tracker/lib/splitEntry.ts` |
| Dividir entradas (split) — UI | `web-ui/src/features/time-tracker/components/SplitEntryDialog.tsx` |
| Solapamiento de entradas | `web-ui/src/features/time-tracker/lib/overlaps.ts`, `components/OverlapAlert.tsx` |
| Balance y periodo | `web-ui/src/features/time-tracker/lib/balance.ts`, `computePeriodTotal.ts`, `periodRange.ts` |
| Panel de progreso del periodo | `web-ui/src/features/time-tracker/components/PeriodProgressPanel.tsx` |
| Servicio de entradas (persistencia) | `web-ui/src/features/time-tracker/services/timeTrackingService.ts` |
| Sincronización con SQL Server (UI) | `web-ui/src/features/time-tracker/components/SyncPanel.tsx` |
| Sincronización con SQL Server (validación) | `web-ui/src/features/sync-validator/index.ts` |
| Guard de configuración | `web-ui/src/features/time-tracker/hooks/useConfigGuard.ts` |

## Frontend — otras features

| Concepto | Archivo |
|----------|---------|
| Dashboard | `web-ui/src/features/dashboard/DashboardPage.tsx` |
| Árbol de proyectos | `web-ui/src/features/projects/components/ProjectTree.tsx` |
| Selector de proceso (tarea) | `web-ui/src/features/process-management/components/ProcessSelector.tsx` |
| Crear proceso (mutación) | `web-ui/src/features/process-management/mutations/useCreateProcess.ts` |
| Propuestas de tarea (UI) | `web-ui/src/features/proposal-ui/components/TaskProposalCard.tsx` |
| Propuestas de tarea (dominio) | `web-ui/src/domain/proposals/extract-local-proposals.ts` |
| Test de conexión a BD | `web-ui/src/features/db-connection/mutations/useTestDbConnection.ts` |

## Frontend — infraestructura

| Concepto | Archivo |
|----------|---------|
| ApiClient (axios wrapper) | `web-ui/src/lib/api/client.ts` |
| Almacenamiento local (IndexedDB) | `web-ui/src/lib/storage/StorageStrategy.ts`, `IndexedDBStorage.ts` |
| Configuración (`ConfigStore`, `dbConfig`, `wizardConfig`) | `web-ui/src/lib/config-storage/ConfigStore.ts`, `web-ui/src/config/stores.ts` |
| Página de Settings | `web-ui/src/pages/SettingsPage.tsx` |
| Atajos de teclado (despachador) | `web-ui/src/lib/keyboard/shortcutDispatcher.ts` |
| Atajos de teclado (hooks) | `web-ui/src/hooks/useGlobalShortcuts.ts`, `useTableKeyboardNavigation.ts`, `useTableRowShortcuts.ts` |
| Command palette | `web-ui/src/components/CommandPalette.tsx` |
| Layout / shell de la app | `web-ui/src/App.tsx`, `web-ui/src/components/AppLayout.tsx` |

## Rutas y entrada

| Concepto | Archivo |
|----------|---------|
| Definición de rutas | `web-ui/src/App.tsx` |
| Punto de entrada | `web-ui/src/main.tsx` |
