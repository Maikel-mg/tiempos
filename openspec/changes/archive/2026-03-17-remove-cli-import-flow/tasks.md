# Tasks: Remove CLI Import Flow

## 1. Verification

- [x] 1.1 Confirm web UI has no dependencies on CLI files
- [x] 1.2 Verify no CI/CD pipelines use npm extract or generate scripts

## 2. Delete CLI Files

- [x] 2.1 Delete extraer-tareas.js
- [x] 2.2 Delete generar-sql.js
- [x] 2.3 Delete csv-utils.js
- [x] 2.4 Delete config.json

## 3. Update package.json

- [x] 3.1 Remove "extract": "node extraer-tareas.js" script from scripts section
- [x] 3.2 Remove "generate": "node generar-sql.js" script from scripts section

## 4. Update README.md

- [x] 4.1 Update project description to reflect web-only focus (lines 1-3)
- [x] 4.2 Remove lines 7-37 (CLI workflow - Paso 1-3 sections)
- [x] 4.3 Remove lines 61-68 (CLI example usage)
- [x] 4.4 Preserve lines 69-95 (web UI documentation)
- [x] 4.5 Verify npm run web and npm run start are clearly documented

## 5. Testing

- [x] 5.1 Verify remaining npm scripts work (web, start, dev-backend)
- [x] 5.2 Test web UI launches with npm run web
- [x] 5.3 Test backend starts with npm run start
