import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommandPalette } from '@/components/CommandPaletteContext';
import { isEditableElement } from '@/lib/keyboard-utils';

/**
 * Global keyboard shortcuts hook.
 * - Cmd/Ctrl+K: Always opens command palette (works even in inputs)
 * - Alt+letter: Navigation shortcuts (only work outside inputs)
 */
export function useGlobalShortcuts() {
  const navigate = useNavigate();
  const { open } = useCommandPalette();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTyping = isEditableElement(document.activeElement);
      
      // Cmd/Ctrl+K: Always open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        open();
        return;
      }
      
      // Alt+letter shortcuts: Only if not typing
      if (isTyping) return;
      
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'd':
            e.preventDefault();
            navigate('/dashboard');
            break;
          case 't':
            e.preventDefault();
            navigate('/time-tracker');
            break;
          case 'p':
            e.preventDefault();
            navigate('/projects');
            break;
          case 'm':
            e.preventDefault();
            navigate('/my-tasks');
            break;
          case ',':
            e.preventDefault();
            navigate('/settings');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, open]);
}
