## Why

The configuration values (usuario, tipoHora, teletrabajo, encoding, archivoTareas) are currently used without validation in `generar-sql.js` and `extraer-tareas.js`. This leads to late failures when invalid config values reach SQL generation. Adding early validation will catch configuration errors immediately with helpful error messages instead of cryptic SQL errors or crashes.

## What Changes

- Add validation functions for config values in `generar-sql.js`:
  - Validate `usuario` is non-empty string
  - Validate `tipoHora` is positive integer
  - Validate `teletrabajo` is 0 or 1
  - Validate `encoding` is a valid Node.js encoding
  - Validate `archivoTareas` is non-empty string
- Validate config immediately after loading (fail fast)
- Provide clear error messages for each validation failure

## Capabilities

### New Capabilities
- `config-validation`: Input validation for configuration values with early error detection and helpful messages

### Modified Capabilities
<!-- None - this is a pure addition -->

## Impact

- `generar-sql.js`: Add config validation at start of script (after loading config)
- `extraer-tareas.js`: Same validation (or shared validation module if extracted)
- No breaking changes - only adds error checking