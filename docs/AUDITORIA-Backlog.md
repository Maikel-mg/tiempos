# Auditoría del backlog `ready-for-agent` — oct 2026

Solo lectura sobre el repo, con evidencia de fichero. Objetivo: saber qué está hecho
antes de que nada lo reconstruya. Veredictos: **hecho / hecho-en-rama / parcial /
ausente / descartada** (definidos en `docs/TECH-DESIGN-SoftwareFactory.md`).

`ready-for-agent` no significa "pendiente". De las 33 issues abiertas con esa etiqueta,
**17 ya están implementadas en `develop`** y **1 está hecha en una rama archivada**.

## Veredictos

| # | Issue | Veredicto | Evidencia |
|---|---|---|---|
| 63 | Replace project tree with SP procesos | **parcial** | `useProcessCache.ts` + `server.ts:/api/processes` hechos; el árbol sigue vivo en `features/projects/components/ProjectTree.tsx` |
| 64 | Backend endpoint GET /api/processes | **hecho** | `server.ts`, `sp-builder.ts` |
| 65 | Rewrite useProcessCache al SP nuevo | **hecho** | `hooks/useProcessCache.ts`, `spNETTiempos_SEL_TraerProcesos` |
| 66 | Simplify ProcessSelectorButton | **hecho** | `components/ProcessSelectorButton.tsx` |
| 67 | Update TimeEntryForm y TimerWidget | **parcial** | ya no existen; sustituidos por `TimeEntryEditorDialog.tsx` + `TimeTrackerBar.tsx` |
| 68 | Remove dead code (ProcessCacheRepository…) | **ausente** | `repositories/ProcessCacheRepository.ts` y `processCacheClient.ts` siguen ahí → **válida** |
| 69 | Rediseño barra inline estilo Clockify | **hecho** | `components/TimeTrackerBar.tsx` cableado en `TimeTrackingPage.tsx` |
| 77 | Grouped view con agregación semana/día | **hecho** | `GroupedEntryView.tsx`, `lib/groupEntriesByWeek.ts` |
| 78 | Lógica de agrupación + tipos | **hecho** | `lib/groupEntriesByWeek.ts` |
| 79 | GroupedEntryView expand/collapse | **hecho** | `components/GroupedEntryView.tsx` |
| 80 | Kebab menu en grouped view | **hecho** | `GroupedEntryView.tsx` |
| 81 | Tab switching con filtro compartido | **hecho** | `components/TimeEntryViewSwitcher.tsx` |
| 82 | Selection + select unsynced | **hecho** | `hooks/useEntrySelection.ts` |
| 90 | Timer corriendo en la lista del día | **hecho** | `TimeEntryList.tsx` renderiza `TimerRow` |
| 91 | timer utilities (virtual entry, period total) | **hecho** | `lib/timerVirtualEntry.ts`, `lib/computePeriodTotal.ts` |
| 92 | TimerRow visual component | **hecho** | `components/TimerRow.tsx` |
| 93 | Wire timer en lista + total del período | **hecho** | `TimeEntryList.tsx`, `hooks/usePeriodFilter.ts` |
| 94 | Mis Tareas — página de consulta | **hecho** | `pages/AvailableTasksPage.tsx` |
| 95 | Recoverable entries (permisos) | **parcial** | `lib/workReminders.ts` existe; el seguimiento de recuperación no está claro → leer |
| 108 | Propuestas de Tarea desde Procesos Genéricos | **hecho** | `domain/proposals/*`, `proposal-ui/TaskProposalModal.tsx` |
| 111 | Horas por tarea en Mis Tareas | **parcial** | página existe; falta `computeTaskHours` (#112) |
| 112 | `computeTaskHours` + tipos + tests | **ausente** | no existe → **piloto** |
| 113 | AvailableTasksPage columna Horas | **ausente** | depende de #112 |
| 114 | Caché selectiva offline | **descartada** | decisión de producto; código en tag `archive/offline-mode` |
| 120 | T6 Sync de Procesos | **descartada** | ídem; commit `11f69f8` en el tag |
| 121 | T7 Indicador global de conexión | **hecho-en-rama** | tag `archive/offline-mode`, commit `ac364ee` → rescatar, no reconstruir |
| 123 | Spec: unificar Balance por período | **parcial** | `PeriodProgressPanel.tsx` y `lib/balance.ts` ya existen |
| 124 | Prefactor: utilidad única de fecha YYYY-MM-DD | **ausente** | `toISOString().slice(0,10)` duplicado en **10 ficheros** (`PeriodProgressPanel` 3 veces) → **válida** |
| 125 | Balance del período desde una sola fuente | **parcial** | lectura necesaria: hay panel y `balance.ts` |
| 126 | Hook `useBalanceBreakdown` | **ausente** | no existe → **válida** |
| 127 | Panel cableado al hook | **ausente** | depende de #126 |
| 128 | Partir el panel en subcomponentes | **ausente** | depende de #126/#127 |
| 132 | Descomponer TimeTrackingPage en hooks | **hecho** | hooks extraídos en #134-#140 (`usePeriodFilter`, `useEntryEditor`, `useEntrySync`, `useProposals`, `useTimerView`, `useSplitFlow`) |

## Consecuencias

1. **17 cierres inmediatos** (#64, #65, #66, #69, #77, #78, #79, #80, #81, #82, #90, #91,
   #92, #93, #94, #108, #132) con la evidencia de arriba. Pendiente de aprobación en lote.
2. **5 "parcial" requieren lectura humana**: #63, #67, #95, #111, #123, #125. No se cierran.
3. **#121 se rescata** del tag, no se reescribe. Es el único caso donde el trabajo archivado
   vale dinero.
4. **#124 es más valiosa de lo que parece**: 10 ficheros duplicando la misma conversión de
   fecha es deuda que ya está costando (y `PeriodProgressPanel` la duplica 3 veces dentro de
   sí mismo).
5. La cola real no son 33 issues: son **14 pendientes de verdad**, y varias dependen de
   #112/#124/#126, que son justo las que el runner iba a coger primero. El orden natural del
   backlog ya era el correcto.

## Método y límites

Detección por existencia y cableado de ficheros (`rg`/`ls` sobre `develop`), no por ejecución.
"Parcial" significa "hay artefacto pero no puedo probar que cubra el criterio de aceptación
completo" — de ahí la lectura humana. No se ha compilado ni ejecutado la app.

Un script de extracción de identificadores por issue (`git grep` de símbolos mencionados en el
cuerpo) dio resultados ruidosos: los `0/0` significaban "no extraje identificadores", no
"no existe". No se usa como base de esta tabla.
