/**
 * Shared keyboard utility functions for table navigation and global shortcuts.
 *
 * Extracted from `useGlobalShortcuts` to enable reuse across the codebase
 * without duplicating editable-element detection logic.
 *
 * **Usage in table navigation:** `shouldInterceptTableKeys()` is called by
 * `useTableKeyboardNavigation` to determine whether arrow keys should move
 * the active row or be passed through to the browser/native handlers.
 *
 * **Usage in global shortcuts:** `isEditableElement()` is called by
 * `useGlobalShortcuts` to decide whether Alt+letter navigation should fire
 * (it should NOT fire when the user is typing in an input).
 */

/**
 * Check if the given element is an editable form control
 * (input, textarea, select, or contentEditable).
 *
 * @param el - The DOM element to check, or null.
 * @returns `true` if the element accepts user text input.
 */
export function isEditableElement(el: Element | null): boolean {
  if (!el) return false;

  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (el.getAttribute('contenteditable') === 'true') return true;

  return false;
}

/**
 * Determine whether table keyboard navigation should intercept key events.
 *
 * Returns `false` when:
 * - The focused element is an editable control (input/textarea/select/contentEditable)
 * - A dialog with `role="dialog"` and `data-state="open"` is present
 * - The cmdk command palette (`[cmdk-dialog]`) is open
 *
 * @returns `true` if table keys (arrows, Home, End, Enter, Escape) should be handled.
 */
export function shouldInterceptTableKeys(): boolean {
  if (isEditableElement(document.activeElement)) return false;
  if (document.querySelector('[role="dialog"][data-state="open"]')) return false;
  if (document.querySelector('[cmdk-dialog]')) return false;
  return true;
}
