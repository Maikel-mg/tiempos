## Context

Users currently have to manually create SQL scripts for task creation in their database before they can assign the resulting IDs in the Importador de Tiempos. To streamline this process, we will add a button to generate the task creation SQL directly from the Step 2 task list.

## Goals / Non-Goals

**Goals:**
- Add a "Generate SQL" button in each task row in `Step2Tasks`.
- Generate a SQL script with the required parameters: `@pNombre`, `@pFechaIniPrevista`, `@pFechaFinPrevista`, `@pTiempoPrevisto`, `@pTecnicoPrev`, `@pFase`, and `@pFechaEstimacion`.
- Support one-click copying of the generated SQL to the clipboard.
- Enhance task data extraction to include total duration in minutes.

**Non-Goals:**
- Automating the execution of the generated SQL (it remains a manual copy-paste operation).
- Changing the primary SQL generation logic for time entries (`spNETTiempos_Alta`).

## Decisions

### 1. Data Model Enhancement
The `extractUniqueTasks` function in `web-ui/src/lib/csv-parser.js` will be updated to calculate:
- `totalMinutes`: The sum of `duracionDecimal` (converted to minutes) for all rows belonging to the task.
- `fechaEstimacion`: Derived from the first day of the month of the task's earliest `fechaInicio`.

### 2. SQL Template
The generated SQL will be formatted as a set of variable declarations to allow flexibility for the user:
```sql
DECLARE @pNombre NVARCHAR(MAX) = '${task.name}';
DECLARE @pFechaIniPrevista VARCHAR(8) = '${task.fechaInicioYYYYMMDD}';
DECLARE @pFechaFinPrevista VARCHAR(8) = '${task.fechaFinYYYYMMDD}';
DECLARE @pTiempoPrevisto INT = ${task.totalMinutes};
DECLARE @pTecnicoPrev INT = ${task.totalMinutes};
DECLARE @pFase NVARCHAR(MAX) = '${config.usuario}';
DECLARE @pFechaEstimacion VARCHAR(8) = '${task.fechaEstimacionYYYYMMDD}';
```

### 3. UI Integration
- A new `Database` icon button will be added to the task row, placed next to the task ID input field.
- The button will trigger a "Copy to clipboard" action.
- A visual feedback (e.g., a toast or a temporary icon change) will indicate success.

### 4. Logic Location
- A new utility function `generateTaskSQL` will be added to `web-ui/src/lib/sql-generator.js`.
- It will handle the date formatting (DD/MM/YYYY to YYYYMMDD) and parameter mapping.

## Risks / Trade-offs

- **[Risk] Date Parsing Failures** → **Mitigation**: Reuse existing `parseSpanishDate` logic from `utils.js` and provide fallbacks.
- **[Risk] Large SQL output in clipboard** → **Mitigation**: The script is relatively short (declarations only), so it should be safe.
- **[Risk] UI Clutter** → **Mitigation**: Use a small icon button to maintain a clean table layout.
