## Why

When executing SQL directly from the UI (button "Ejecutar en BD"), the stored procedure `spNETTiempos_Alta` fails with error: "The conversion of a varchar data type to a datetime data type resulted in an out-of-range value." The same SQL copied and executed in SQL Server Management Studio works fine. This is because the Node.js connection uses English date format (MDY) while SSMS uses Spanish (DMY).

## What Changes

- Prepend `SET DATEFORMAT dmy;` to SQL statements in `generateSQLStatement()` to ensure reliable date parsing
- Keep dates in `DD/MM/YYYY` format for consistency with the stored procedure's typical input
- Update backend to handle connection pool properly to avoid "Login failed" errors during configuration changes
- No changes to copy-to-clipboard functionality (other than the additional `SET DATEFORMAT` command)

## Capabilities

### New Capabilities
- None - this is a bug fix to existing functionality

### Modified Capabilities
- `sql-generation`: Ensure SQL execution uses `SET DATEFORMAT dmy` for reliability across different database locales.

## Impact

- **Code affected**: `web-ui/src/lib/sql-generator.js` - `generateSQLStatement()` function
- **No breaking changes**: The copy-to-clipboard feature continues to work as before (users can still copy the original format)
- **No new dependencies**: Uses existing `formatToYYYYMMDD()` utility function from `utils.js`
