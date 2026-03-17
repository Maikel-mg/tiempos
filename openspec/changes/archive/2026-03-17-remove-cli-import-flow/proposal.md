# Remove CLI Import Flow

## Why

The project needs to simplify by removing the CLI-based import flow that is now maintained exclusively by the web interface, reducing maintenance burden and eliminating duplicate functionality.

## What Changes

- **BREAKING**: Delete `extraer-tareas.js` - CLI script to extract tasks from CSV
- **BREAKING**: Delete `generar-sql.js` - CLI script to generate SQL statements
- **BREAKING**: Delete `csv-utils.js` - CSV parsing utilities for CLI
- **BREAKING**: Delete `config.json` - CLI configuration file
- Remove npm scripts: `extract` and `generate` from package.json
- Update `README.md` to remove CLI workflow documentation (lines 7-68)
- Update project description to reflect web-only focus

## Capabilities

### New Capabilities
(None - this is a removal-only change)

### Modified Capabilities
(None - removing CLI does not change web interface behavior)

## Impact

- Affected files: 4 CLI scripts removed, package.json and README.md modified
- User impact: Users must use web interface instead of CLI commands
- Dependencies: None - CLI and web are completely independent
- Testing: Web UI functionality remains unchanged
