import { useEffect, useState } from 'react';
import { wizardConfig } from '@/config/stores';
import { processOfflineService } from '../services/ProcessOfflineService';

const SUGGESTION_KEY = 'offline-process-selector-first-experience';

interface OfflineFirstExperienceOptions {
  open: boolean;
  hasTasks: boolean;
  loading: boolean;
}

/**
 * Checks connectivity once when an empty selector is opened and shows a
 * project-marking suggestion only once for each configured usuario.
 */
export function useOfflineFirstExperience({
  open,
  hasTasks,
  loading,
}: OfflineFirstExperienceOptions): boolean {
  const [suggestionVisible, setSuggestionVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setSuggestionVisible(false);
      return;
    }
    if (loading || hasTasks) return;

    const usuario = wizardConfig.get()?.usuario ?? '';
    if (!usuario) return;

    const storageKey = `${SUGGESTION_KEY}:${usuario}`;
    try {
      if (localStorage.getItem(storageKey) === '1') return;
    } catch {
      return;
    }

    let cancelled = false;
    void processOfflineService
      .getProjects(usuario, { refresh: true })
      .then(() => {
        if (cancelled) return;
        localStorage.setItem(storageKey, '1');
        setSuggestionVisible(true);
      })
      .catch(() => {
        // A failed connectivity check leaves the offline guidance in place.
      });

    return () => {
      cancelled = true;
    };
  }, [open, hasTasks, loading]);

  return suggestionVisible;
}
