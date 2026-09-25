import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommandPalette } from '@/components/CommandPaletteContext';
import { useTheme } from '@/hooks/useTheme';
import { useTimerToggle } from '@/hooks/useTimerToggle';
import { isEditableElement } from '@/lib/keyboard-utils';
import {
  SHORTCUT_PRIORITY,
  altKey,
  commandKey,
  registerShortcut,
} from '@/lib/keyboard/shortcutDispatcher';

const navigationShortcuts = [
  { key: 'd', url: '/dashboard' },
  { key: 't', url: '/time-tracker' },
  { key: 'p', url: '/projects' },
  { key: 'm', url: '/my-tasks' },
  { key: ',', url: '/settings' },
];

/**
 * Global keyboard shortcuts, registered in the central dispatcher.
 * - Cmd/Ctrl+K: Always opens command palette (works even in inputs)
 * - Cmd/Ctrl+Shift+T: Toggle theme (works even in inputs)
 * - Cmd/Ctrl+Shift+S: Start/stop the timer with the last used task (works even in inputs)
 * - Alt+letter: Navigation shortcuts (only work outside inputs)
 */
export function useGlobalShortcuts() {
  const navigate = useNavigate();
  const { open } = useCommandPalette();
  const { toggle: toggleTheme } = useTheme();
  const { toggle: toggleTimerToggle } = useTimerToggle();

  useEffect(() => {
    const unregister = [
      // Cmd/Ctrl+K: always open the command palette.
      registerShortcut({
        id: 'global.command-palette',
        priority: SHORTCUT_PRIORITY.global,
        match: commandKey('k'),
        run: () => open(),
      }),

      // Cmd/Ctrl+Shift+T: toggle theme.
      registerShortcut({
        id: 'global.toggle-theme',
        priority: SHORTCUT_PRIORITY.global,
        match: commandKey('t', { shift: true }),
        run: () => toggleTheme(),
      }),

      // Cmd/Ctrl+Shift+S: toggle the timer with the last used task.
      registerShortcut({
        id: 'global.toggle-timer',
        priority: SHORTCUT_PRIORITY.global,
        match: commandKey('s', { shift: true }),
        run: () => {
          void toggleTimerToggle();
        },
      }),

      // Alt+letter: navigation, only outside inputs.
      ...navigationShortcuts.map(({ key, url }) =>
        registerShortcut({
          id: `global.nav-${url}`,
          priority: SHORTCUT_PRIORITY.global,
          when: () => !isEditableElement(document.activeElement),
          match: altKey(key),
          run: () => navigate(url),
        })
      ),
    ];

    return () => unregister.forEach((off) => off());
  }, [navigate, open, toggleTheme, toggleTimerToggle]);
}
