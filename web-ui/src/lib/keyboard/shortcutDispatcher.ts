/**
 * Central keyboard shortcut dispatcher.
 *
 * A single `window` keydown listener routes every event to the registered
 * shortcuts, highest priority first. The first shortcut whose `when()` passes
 * and whose `match()` returns true handles the event and consumes it
 * (`preventDefault` + `stopImmediatePropagation`); non-matching shortcuts are
 * skipped.
 *
 * Why this exists: independent `window` listeners used to race each other, so a
 * global combination such as `Alt+D` also matched a bare-letter row shortcut and
 * fired both (navigate + duplicate). One dispatcher with explicit priority makes
 * the precedence real instead of accidental.
 *
 * Convention:
 * - bare letter   → contextual action (e.g. the active table row) — `table`
 * - Alt+letter    → navigation — `global`
 * - Ctrl/Cmd+...  → global action — `global`
 * - open dialog   → `dialog` (always wins over the table underneath)
 */

export const SHORTCUT_PRIORITY = {
  global: 10,
  table: 50,
  dialog: 100,
} as const;

export interface ShortcutSpec {
  /** Stable identifier, useful for debugging and tests. */
  id: string;
  /** Higher priority is evaluated first. Defaults to 0. */
  priority?: number;
  /** Evaluated at dispatch time; return false to skip this shortcut now. */
  when?: () => boolean;
  /** Return true when this shortcut should handle the event. */
  match: (event: KeyboardEvent) => boolean;
  /** Handle the event. The dispatcher has already called `preventDefault`. */
  run: (event: KeyboardEvent) => void;
}

let registered: ShortcutSpec[] = [];
let listening = false;

function orderedShortcuts(): ShortcutSpec[] {
  return [...registered].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

function handleKeyDown(event: KeyboardEvent) {
  for (const shortcut of orderedShortcuts()) {
    if (shortcut.when && !shortcut.when()) continue;
    if (!shortcut.match(event)) continue;
    event.preventDefault();
    event.stopImmediatePropagation();
    shortcut.run(event);
    return;
  }
}

function attachListener() {
  if (listening) return;
  window.addEventListener('keydown', handleKeyDown);
  listening = true;
}

function detachListener() {
  if (!listening) return;
  window.removeEventListener('keydown', handleKeyDown);
  listening = false;
}

/**
 * Register a shortcut. Returns an unregister function (safe to call more than
 * once) intended for effect cleanup.
 */
export function registerShortcut(shortcut: ShortcutSpec): () => void {
  registered = [...registered, shortcut];
  attachListener();
  return () => {
    registered = registered.filter((s) => s !== shortcut);
    if (registered.length === 0) detachListener();
  };
}

/** Test-only: drop every registered shortcut and detach the listener. */
export function clearShortcuts(): void {
  registered = [];
  detachListener();
}

/**
 * Normalize `event.key` for comparison: always lowercased, so `d` and `D`,
 * `Enter` and `enter` all compare equal.
 */
export function normalizeKey(event: KeyboardEvent): string {
  return event.key.toLowerCase();
}

/**
 * Matcher for a bare key press: no Ctrl, Cmd or Alt (Shift allowed). Row-level
 * letter shortcuts must never fire for combinations such as `Alt+D`, which
 * belongs to navigation.
 */
export function bareKey(...keys: string[]): (event: KeyboardEvent) => boolean {
  const normalized = new Set(keys.map((key) => key.toLowerCase()));
  return (event) =>
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    normalized.has(normalizeKey(event));
}

/**
 * Matcher for a Ctrl/Cmd combination. Pass `shift: true` to require Shift, or
 * omit it to ignore Shift entirely.
 */
export function commandKey(
  key: string,
  options: { shift?: boolean } = {}
): (event: KeyboardEvent) => boolean {
  const normalized = key.toLowerCase();
  return (event) => {
    if (!event.metaKey && !event.ctrlKey) return false;
    if (options.shift !== undefined && event.shiftKey !== options.shift) return false;
    return normalizeKey(event) === normalized;
  };
}

/** Matcher for an Alt-only combination (no Ctrl/Cmd/Shift). */
export function altKey(key: string): (event: KeyboardEvent) => boolean {
  const normalized = key.toLowerCase();
  return (event) =>
    event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    normalizeKey(event) === normalized;
}
