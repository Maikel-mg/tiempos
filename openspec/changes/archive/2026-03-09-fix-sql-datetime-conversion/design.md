## Context

The application generates SQL statements to register time entries via stored procedure `spNETTiempos_Alta`. Currently, dates are passed in Spanish format `DD/MM/YYYY` which works when:
1. User copies SQL and executes in SSMS (SSMS respects user's regional settings)
2. User's SQL Server connection has Spanish language configured

But fails when:
1. Executing via the Node.js API (uses English/MDY by default)
2. SQL Server connection has English language (default for many installations)

The error occurs at `web-ui/src/lib/sql-generator.js:159` where `generateSQLStatement()` builds the SQL string with `@Fecha='${fechaInicio}'`.

## Goals / Non-Goals

**Goals:**
- Fix the datetime conversion error when executing SQL via API
- Use `SET DATEFORMAT dmy` which ensures reliable parsing of `DD/MM/YYYY` dates
- Maintain backward compatibility with copy-to-clipboard feature

**Non-Goals:**
- Not modifying the format shown to user in UI
- Not changing how dates are stored/validated in the CSV
- Not adding user-configurable date format options (future enhancement)

## Decisions

### Decision 1: Use `SET DATEFORMAT dmy` and `DD/MM/YYYY`

**Chosen:** Prepend `SET DATEFORMAT dmy;` to each SQL statement and keep dates in `DD/MM/YYYY` format.

**Rationale:**
- Even though ISO was considered, `SET DATEFORMAT dmy` + original `DD/MM/YYYY` proved to be the most reliable approach that the user confirmed works both in SSMS and via the API.
- Eliminates ambiguity in Node.js/mssql driver language settings.

**Alternative considered:**
- ISO format `YYYY-MM-DD` - rejected as it was causing the original conversion error.
- ISO format `YYYYMMDD` - rejected as it was less natural and required more extensive mapping changes.

### Decision 2: Where to Apply the Change

**Chosen:** Modify `generateSQLStatement()` to include the `SET` command.

**Implementation location:** `web-ui/src/lib/sql-generator.js`

**Approach:**
1. Update `generateSQLStatement()` template to prepend `SET DATEFORMAT dmy;`.
2. Use `fechaInicio` directly as parsed from the CSV.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Date format conversion could fail on edge cases (empty, invalid) | Function already validates format before conversion; invalid dates will fail earlier in the pipeline |
| Copy-to-clipboard now shows different format than before | Acceptable - user confirmed they prefer ISO; SQL works in both SSMS and API |

## Migration Plan

1. **Deploy**: Single file change (`sql-generator.js`)
2. **Testing**: 
   - Test "Ejecutar en BD" with a sample CSV
   - Verify dates appear correctly in database
3. **Rollback**: Revert file change if issues arise
