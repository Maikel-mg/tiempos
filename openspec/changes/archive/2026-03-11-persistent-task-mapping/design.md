## Context

The web UI currently manages task-to-process ID mappings in volatile React state within the `useWizard` hook. This state is lost on every page refresh or when a new CSV is uploaded, forcing users to re-enter IDs for tasks they have already mapped in previous sessions.

## Goals / Non-Goals

**Goals:**
- Persist task-to-process ID mappings across browser sessions using `localStorage`.
- Automatically suggest IDs for known task names when a new CSV is uploaded.
- Ensure the system "learns" from manual overrides.
- Provide a seamless user experience where suggestions feel natural and non-intrusive.

**Non-Goals:**
- Implementing a server-side database for mappings.
- Syncing mappings between different browsers or users.
- Complex NLP-based fuzzy matching (at least for the first iteration).
- Managing the legacy `tareas_mapeo.json` file from the web UI.

## Decisions

### 1. Storage: `localStorage`
**Rationale:** Simple, synchronous, and perfectly suited for small key-value pairs like task names to IDs. It avoids the complexity of IndexedDB while meeting all persistence requirements for a single-user local tool.
**Key:** `persistent_task_mappings`

### 2. Matching Strategy: Exact + Sanitized Match
**Rationale:** Task names often have minor variations (trailing spaces, casing). We will first try an exact match, then a sanitized match (lowercase, trimmed).
**Evolution:** If exact/sanitized matches fail, we can consider prefix matching or "most common ID" logic if the same task name has been mapped differently (though unlikely in this context).

### 3. Integration Point: `useWizard` Hook
**Rationale:** Centralizing the persistence logic in the wizard hook ensures that all steps (Step 2 for entry, Step 3 for SQL generation) have access to the same up-to-date mapping data. It also keeps the UI components cleaner.

### 4. Learning Trigger: Validation Success
**Rationale:** We will save a mapping to `localStorage` only when it passes validation in `Step2Tasks`. This prevents garbage data from polluting the persistent store.

## Risks / Trade-offs

- **[Risk] Storage Bloat** → [Mitigation] Task names and IDs are small. Even thousands of mappings will take less than 1MB of the 5MB limit.
- **[Risk] Incorrect Suggestions** → [Mitigation] Clear visual indication of suggested vs. manually entered IDs, and easy override capability.
- **[Risk] Browser Privacy Settings** → [Mitigation] If `localStorage` is disabled, the system will fallback to the current volatile state behavior without crashing.
