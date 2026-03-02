## 1. Data Model & Utilities

- [x] 1.1 Update `extractUniqueTasks` in `web-ui/src/lib/csv-parser.js` to calculate `totalMinutes` per task.
- [x] 1.2 Implement a date formatting utility for `YYYYMMDD` format in `web-ui/src/lib/utils.js`.
- [x] 1.3 Add `generateTaskSQL` function in `web-ui/src/lib/sql-generator.js` using the required parameters.

## 2. UI Implementation

- [x] 2.1 Update `Step2Tasks.jsx` to include a "Generate SQL" button in each task row.
- [x] 2.2 Implement the copy-to-clipboard functionality for the generated SQL in `Step2Tasks.jsx`.
- [x] 2.3 Add visual feedback (temporary icon change or tooltip) to confirm successful copying.

## 3. Verification

- [ ] 3.1 Verify that `@pNombre`, `@pFechaIniPrevista`, `@pFechaFinPrevista`, `@pTiempoPrevisto`, `@pTecnicoPrev`, `@pFase`, and `@pFechaEstimacion` are correctly mapped.
- [ ] 3.2 Ensure the generated SQL follows the format required by the user.
- [ ] 3.3 Confirm that assigning task IDs still works correctly after the UI changes.
