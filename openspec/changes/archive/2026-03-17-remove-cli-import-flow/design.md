# Design: Remove CLI Import Flow

## Context

The project originally supported both CLI and web interfaces for CSV import workflow. The web interface (`web-ui/`) is a complete React application with in-browser CSV parsing and SQL generation, fully independent of the CLI scripts. Maintaining both workflows creates unnecessary complexity and potential divergence.

CLI files to be removed:
- `extraer-tareas.js` (133 lines) - Extract unique tasks from CSV to JSON
- `generar-sql.js` (257 lines) - Generate SQL statements from CSV with task mapping
- `csv-utils.js` (118 lines) - CSV parsing utilities (separator detection, parsing, validation)
- `config.json` (8 lines) - CLI configuration (usuario, teletrabajo, tipoHora, etc.)

NPM scripts to remove:
- `extract`: `node extraer-tareas.js`
- `generate`: `node generar-sql.js`

## Goals / Non-Goals

### Goals

- Remove all CLI-specific code to simplify the codebase
- Eliminate duplicate functionality (CSV parsing, SQL generation)
- Reduce maintenance burden
- Update documentation to reflect web-only approach
- Ensure web UI remains fully functional

### Non-Goals

- No changes to web UI implementation
- No changes to `server.js` (backend for web UI with Clockify API and DB connections)
- No changes to existing OpenSpec specs
- No backwards compatibility for CLI scripts

## Decisions

### 1. Complete Removal vs Partial Removal

**Decision**: Delete all 4 CLI files completely rather than marking as deprecated.

**Rationale**: The web interface (`web-ui/`) has complete feature parity and includes its own implementations:
- `web-ui/src/lib/csv-parser.js` - In-browser CSV parsing using FileReader API
- `web-ui/src/lib/sql-generator.js` - In-browser SQL generation
- No code reuse between CLI and web - they are completely independent

Keeping deprecated files adds confusion and potential for users to accidentally use outdated code.

**Alternatives considered**:
- Move CLI files to `archive/` folder - Rejected, unnecessary clutter; git history preserves the files
- Add deprecation warnings that direct users to web UI - Rejected, web UI is already the primary interface

### 2. Documentation Strategy

**Decision**: Re-write README.md to focus entirely on web UI workflow.

**Rationale**: CLI sections are extensive (lines 7-68: paso 1-3, example usage). A clean rewrite is clearer than piecemeal deletion and leaves a cohesive document focused on the web interface.

**Alternatives considered**:
- Simply delete CLI sections (lines 7-68) - Rejected, leaves disjointed document with gaps
- Add migration guide for CLI users - Rejected, no migration needed; users just use web UI instead

### 3. Error Handling for Removed Scripts

**Decision**: No backwards compatibility. Scripts will simply not exist.

**Rationale**: This is a breaking change by design. The web UI provides the same functionality in a more user-friendly interface. Users attempting to run removed scripts will get a clear "command not found" error from npm/node.

**Alternatives considered**:
- Add stub scripts that print message directing to web UI - Rejected, adds technical debt for no benefit
- Keep scripts for one release with deprecation warning - Rejected, unnecessary complexity; web UI is already stable

### 4. Package.json Script Cleanup

**Decision**: Remove only the `extract` and `generate` scripts, keep all others unchanged.

**Rationale**: The remaining scripts are web-focused:
- `web`: `cd web-ui && npm run dev` - Web UI dev server
- `start`: `node --env-file=.env server.js` - Backend server for web UI
- `dev-backend`: `node --watch server.js` - Backend with watch mode

**Alternatives considered**:
- Remove all scripts and restructure - Rejected, unnecessary; current scripts serve web workflow well

## Risks / Trade-offs

[Risk] Users with automated scripts or CI/CD pipelines using `npm run extract` or `npm run generate`
- [Mitigation] Breaking change is clear and explicit; update commits will document the change. Users must migrate to web UI or create their own workflow around web API if needed.

[Risk] README.md editing accidentally removes web UI sections (lines 69-95)
- [Mitigation] Careful review of changes; preserve existing web UI documentation intact.

[Risk] Existing CI/CD pipelines reference removed npm scripts
- [Mitigation] Verify no active pipelines use these scripts before merging. The scripts appear to be used manually, not in automation.

[Risk] Users unfamiliar with web UI may find breaking change disruptive
- [Mitigation] Web UI is already documented in README and is the primary interface. Removing CLI clarifies the supported workflow.

## Migration Plan

### Deployment Steps

1. Verify no active usage of CLI scripts (check recent git commits, CI/CD pipelines)
2. Delete 4 CLI files from repository root
3. Update `package.json`:
   - Remove `extract` script from `scripts` section
   - Remove `generate` script from `scripts` section
   - Optionally update `description` field to reflect web-only focus
4. Rewrite `README.md`:
   - Update project description (lines 1-3)
   - Remove lines 7-68 (CLI workflow and example sections)
   - Preserve lines 69-95 (web UI documentation)
   - Ensure clear web-only workflow instructions
5. Test that remaining npm scripts work:
   - `npm run web` - Web UI dev server launches
   - `npm run start` - Backend server starts
   - `npm run dev-backend` - Backend with watch mode

### Rollback Strategy

None - this is a file deletion change. Git history preserves all deleted files if revert is needed. Restoring files to previous state is straightforward.

### Verification

After deployment, verify:
- No CLI files remain in repository (except in archive or git history)
- Web UI launches successfully with `npm run web`
- CSV import functionality works end-to-end in web UI
- SQL generation works in web UI preview
- Backend server starts with `npm run start` and serves Clockify API endpoints

## Open Questions

None. This is a straightforward removal change with clear scope and no technical unknowns.
