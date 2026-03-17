## 1. Module Structure Setup

- [x] 1.1 Create unified SQL generator module at `web-ui/src/lib/sql-generator/`
- [x] 1.2 Set up dual export (ESM for browser, CJS for Node.js) in package.json
- [x] 1.3 Verify module can be imported in both environments

## 2. Core API Implementation

- [x] 2.1 Implement generateTimeEntrySQL(entries, taskMapping, config) function
- [x] 2.2 Implement generateTaskSQL(task) function
- [x] 2.3 Implement generateFromSource(source, taskMapping, config) function
- [x] 2.4 Add backward-compatible exports (generateSQL, generateSQLFromObjects, etc.)

## 3. Stored Procedure Registry

- [x] 3.1 Create internal registry for spNETTiempos_Alta parameters
- [x] 3.2 Create internal registry for spNETTiempos_Procesos_Mantenimiento parameters
- [x] 3.3 Implement parameter resolution logic
- [x] 3.4 Add helper to build SP call strings

## 4. Date/Duration Parsing Utilities

- [x] 4.1 Implement parseISO8601DurationToMinutes()
- [x] 4.2 Implement decimalHorasAMinutos()
- [x] 4.3 Implement formatISOToSQLDate()
- [x] 4.4 Implement formatISOToSQLTime()
- [x] 4.5 Implement escapeSQL() with injection prevention

## 5. Validation

- [x] 5.1 Implement validarFecha()
- [x] 5.2 Implement validarHora()
- [x] 5.3 Implement validarIdProceso()
- [x] 5.4 Implement validarSeguroSQL()

## 6. Migration and Testing

- [x] 6.1 Update Step2Tasks.jsx to use new module
- [x] 6.2 Update Step3Preview.jsx to use new module
- [x] 6.3 Update LiveTimeEntriesPage.jsx to use new module
- [x] 6.4 Update generar-sql.js (Node CLI) to use new module
- [x] 6.5 Remove duplicate code from csv-parser.js (keep only what's needed)
- [x] 6.6 Add boundary tests for the 3 main functions

## 7. Cleanup

- [x] 7.1 Remove old generateSQL alias if fully migrated
- [x] 7.2 Verify all existing functionality works
- [x] 7.3 Document new API in code comments
