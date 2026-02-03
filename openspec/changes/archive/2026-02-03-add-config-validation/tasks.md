## 1. Add validation functions to generar-sql.js

- [x] 1.1 Create `validarConfig()` function that validates all config fields
- [x] 1.2 Add `validarUsuario(valor)` - check non-empty string
- [x] 1.3 Add `validarTipoHora(valor)` - check positive integer
- [x] 1.4 Add `validarTeletrabajo(valor)` - check 0 or 1
- [x] 1.5 Add `validarEncoding(valor)` - check valid Node.js encoding
- [x] 1.6 Add `validarArchivoTareas(valor)` - check non-empty string
- [x] 1.7 Call `validarConfig(config)` immediately after loading config (line 5)
- [x] 1.8 Exit with code 1 and print error to stderr if validation fails

## 2. Add validation to extraer-tareas.js

- [x] 2.1 Copy validation functions from generar-sql.js (or import if extracted)
- [x] 2.2 Call `validarConfig(config)` immediately after loading config (line 5)
- [x] 2.3 Exit with code 1 and print error to stderr if validation fails

## 3. Test the implementation

- [x] 3.1 Test with valid config.json - should run normally
- [x] 3.2 Test with empty usuario - should fail with clear error
- [x] 3.3 Test with invalid tipoHora (negative) - should fail with clear error
- [x] 3.4 Test with teletrabajo=2 - should fail with clear error
- [x] 3.5 Test with invalid encoding - should fail with clear error
- [x] 3.6 Test with empty archivoTareas - should fail with clear error
- [x] 3.7 Verify error messages match spec requirements

## 4. Update tasks.md to mark completion

- [x] 4.1 Mark all tasks as complete after testing
- [x] 4.2 Verify all scenarios from specs/config-validation/spec.md are covered