import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isEditableElement, shouldInterceptTableKeys } from '../keyboard-utils';

describe('isEditableElement', () => {
  it('returns true for input elements', () => {
    const input = document.createElement('input');
    expect(isEditableElement(input)).toBe(true);
  });

  it('returns true for textarea elements', () => {
    const textarea = document.createElement('textarea');
    expect(isEditableElement(textarea)).toBe(true);
  });

  it('returns true for select elements', () => {
    const select = document.createElement('select');
    expect(isEditableElement(select)).toBe(true);
  });

  it('returns true for contentEditable elements', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    expect(isEditableElement(div)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isEditableElement(null)).toBe(false);
  });

  it('returns false for regular div elements', () => {
    const div = document.createElement('div');
    expect(isEditableElement(div)).toBe(false);
  });

  it('returns false for buttons', () => {
    const button = document.createElement('button');
    expect(isEditableElement(button)).toBe(false);
  });

  it('returns false for contentEditable="false"', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'false');
    expect(isEditableElement(div)).toBe(false);
  });
});

describe('shouldInterceptTableKeys', () => {
  let originalActiveElement: Element | null;

  beforeEach(() => {
    originalActiveElement = document.activeElement;
    // Ensure no open dialogs
    document.querySelectorAll('[role="dialog"][data-state="open"]').forEach(el => el.remove());
    document.querySelectorAll('[cmdk-dialog]').forEach(el => el.remove());
  });

  afterEach(() => {
    // Restore focus
    if (originalActiveElement && 'focus' in originalActiveElement) {
      (originalActiveElement as HTMLElement).focus();
    } else {
      document.body.focus();
    }
  });

  it('returns true when no editable element is focused', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    div.focus();

    expect(shouldInterceptTableKeys()).toBe(true);

    document.body.removeChild(div);
  });

  it('returns false when an input is focused', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    expect(shouldInterceptTableKeys()).toBe(false);

    document.body.removeChild(input);
  });

  it('returns false when a textarea is focused', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    expect(shouldInterceptTableKeys()).toBe(false);

    document.body.removeChild(textarea);
  });

  it('returns false when a select is focused', () => {
    const select = document.createElement('select');
    document.body.appendChild(select);
    select.focus();

    expect(shouldInterceptTableKeys()).toBe(false);

    document.body.removeChild(select);
  });

  it('returns false when a contentEditable element is focused', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    document.body.appendChild(div);
    div.focus();

    expect(shouldInterceptTableKeys()).toBe(false);

    document.body.removeChild(div);
  });

  it('returns false when a dialog with data-state="open" is present', () => {
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('data-state', 'open');
    document.body.appendChild(dialog);

    // Focus a non-editable element
    const div = document.createElement('div');
    document.body.appendChild(div);
    div.focus();

    expect(shouldInterceptTableKeys()).toBe(false);

    document.body.removeChild(dialog);
    document.body.removeChild(div);
  });

  it('returns false when a cmdk-dialog is present', () => {
    const cmdkDialog = document.createElement('div');
    cmdkDialog.setAttribute('cmdk-dialog', '');
    document.body.appendChild(cmdkDialog);

    // Focus a non-editable element
    const div = document.createElement('div');
    document.body.appendChild(div);
    div.focus();

    expect(shouldInterceptTableKeys()).toBe(false);

    document.body.removeChild(cmdkDialog);
    document.body.removeChild(div);
  });

  it('returns true when dialog is closed (data-state="closed")', () => {
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('data-state', 'closed');
    document.body.appendChild(dialog);

    const div = document.createElement('div');
    document.body.appendChild(div);
    div.focus();

    expect(shouldInterceptTableKeys()).toBe(true);

    document.body.removeChild(dialog);
    document.body.removeChild(div);
  });
});
