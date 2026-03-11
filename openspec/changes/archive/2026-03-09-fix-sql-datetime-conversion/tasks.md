## 1. Date Conversion Implementation

- [x] 1.1 Create helper function `formatDateToISO(dateStr)` in sql-generator.js to convert DD/MM/YYYY to YYYY-MM-DD
- [x] 1.2 Import the function or use existing `formatToYYYYMMDD` from utils.js
- [x] 1.3 Update `generateSQLStatement()` to use `SET DATEFORMAT dmy` and `DD/MM/YYYY` format for reliability
- [x] 1.4 Update `generateSQLStatement()` to convert `fechaFin` to ISO format (if applicable) - N/A: fechaFin not used in spNETTiempos_Alta

## 2. Testing

- [x] 2.1 Test "Ejecutar en BD" with a sample CSV to verify no datetime conversion error
- [x] 2.2 Verify dates are correctly stored in the database
- [x] 2.3 Verify copy-to-clipboard still works (shows SQL with SET DATEFORMAT and natural dates)
