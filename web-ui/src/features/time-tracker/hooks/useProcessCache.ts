import { useState, useEffect, useCallback, useRef } from 'react';
import { ProcessCacheRepository } from '../repositories/ProcessCacheRepository';
import type { Proceso } from '../types';
import type { Table } from 'dexie';

interface ApiClient {
  post<T>(url: string, data?: unknown): Promise<T>;
}

interface ProcessCacheDB {
  table(name: string): Table;
}

/** Fallback data when IndexedDB is empty — matches the old TaskSelector sample */
const SAMPLE_PROCESSES: Proceso[] = [
  { proceso: 1, nombre: 'Desarrollo Feature X' },
  { proceso: 2, nombre: 'Bug Fix Login' },
  { proceso: 3, nombre: 'Reunión Sprint' },
  { proceso: 4, nombre: 'Code Review' },
  { proceso: 5, nombre: 'Documentación API' },
];

/**
 * Hook that wraps ProcessCacheRepository for React components.
 * On mount, reads from IndexedDB. Falls back to sample data when empty.
 * markUsed() persists the selected process to IndexedDB for next time.
 */
export function useProcessCache(db: ProcessCacheDB, apiClient: ApiClient) {
  const [processes, setProcesses] = useState<Proceso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const repoRef = useRef<ProcessCacheRepository | null>(null);

  // Lazily create the repository instance
  if (!repoRef.current) {
    repoRef.current = new ProcessCacheRepository(db, apiClient);
  }

  const repo = repoRef.current;

  // Load processes from IndexedDB on mount (no API call)
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const all = await db.table('processes').toArray();
        if (!cancelled) {
          // Fall back to sample data when cache is empty
          setProcesses(all.length > 0 ? all : SAMPLE_PROCESSES);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error loading processes');
          setProcesses(SAMPLE_PROCESSES);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [db]);

  const search = useCallback((text: string): Proceso[] => {
    if (!text) return processes;
    const lower = text.toLowerCase();
    return processes.filter(
      (p) =>
        p.nombre.toLowerCase().includes(lower) ||
        (p.faseNombre ?? '').toLowerCase().includes(lower) ||
        (p.proyectoNombre ?? '').toLowerCase().includes(lower)
    );
  }, [processes]);

  const getRecent = useCallback(async (limit = 10): Promise<Proceso[]> => {
    return repo.getRecent(limit);
  }, [repo]);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await repo.refresh();
      const all = await db.table('processes').toArray();
      setProcesses(all.length > 0 ? all : SAMPLE_PROCESSES);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error refreshing processes');
    }
  }, [repo, db]);

  const markUsed = useCallback(async (process: Proceso): Promise<void> => {
    await repo.markUsed(process);
    // Re-read from IndexedDB to update the in-memory list
    const all = await db.table('processes').toArray();
    setProcesses(all.length > 0 ? all : SAMPLE_PROCESSES);
  }, [repo, db]);

  return {
    processes,
    loading,
    error,
    search,
    getRecent,
    refresh,
    markUsed,
  };
}
