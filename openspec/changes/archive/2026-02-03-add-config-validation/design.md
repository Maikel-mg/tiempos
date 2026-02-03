## Context

The project is a Node.js CLI tool that imports time tracking data from CSV files to SQL Server. Configuration is stored in `config.json` and loaded at startup in both `extraer-tareas.js` and `generar-sql.js`. Currently, config values are used without validation, leading to late failures during SQL generation or CSV processing.

## Goals / Non-Goals

**Goals:**
- Validate all config values immediately after loading (fail fast)
- Provide clear, actionable error messages for each validation failure
- Ensure config errors are caught before any data processing begins
- Validate: usuario (non-empty string), tipoHora (positive int), teletrabajo (0 or 1), encoding (valid Node encoding), archivoTareas (non-empty string)

**Non-Goals:**
- Extract validation to a separate module (keep it simple for now)
- Add validation for other config values not used in the main flow
- Create a complex validation framework
- Add automatic config file creation or migration

## Decisions

### Decision 1: Inline validation in both scripts
**Decision**: Add validation functions directly in each script rather than extracting to a shared module.

**Rationale**: 
- The scripts are independent CLI tools (70-210 lines each)
- Duplicating 20-30 lines of validation is acceptable for simplicity
- Keeps each script self-contained and readable
- No need for additional module complexity on a small codebase

**Alternatives considered**:
- Extract to `config-validator.js` module: Rejected—overkill for 2 files, adds module dependency complexity

### Decision 2: Validate immediately after loading config
**Decision**: Run all validations immediately after `JSON.parse()` before any other code runs.

**Rationale**:
- Ensures fail-fast behavior—errors surface immediately
- Prevents partial processing of data with invalid config
- Clear separation: validation first, then business logic

### Decision 3: Process.exit(1) on validation failure
**Decision**: Exit with code 1 and print error to stderr when validation fails.

**Rationale**:
- Standard Unix exit code for errors
- Prevents any further execution that could corrupt data
- Consistent with existing error handling pattern in the scripts

## Risks / Trade-offs

- [Duplicated code] → Validation logic duplicated in 2 files. **Mitigation**: If we add more scripts later, extract to a module then.
- [Tight coupling] → Validation functions coupled to specific config structure. **Mitigation**: Config structure is stable, validation is straightforward.
- [Limited extensibility] → Adding new config fields requires updating both validation blocks. **Mitigation**: Unlikely to add many more fields; tradeoff acceptable for simplicity.