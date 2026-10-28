import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useEntrySync } from '../useEntrySync';
import { toast } from 'sonner';
import { dbConfig, wizardConfig } from '@/config/stores';
import { syncTimeEntries } from '../../services/timeEntrySyncService';
import type { TimeEntry } from '../../types';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

vi.mock('@/config/stores', () => ({
  dbConfig: { get: vi.fn() },
  wizardConfig: { get: vi.fn() },
}));

vi.mock('../../services/timeEntrySyncService', () => ({
  syncTimeEntries: vi.fn(),
}));

const FULL_DB_CONFIG = { server: 'localhost', database: 'mydb', username: 'sa', password: 'pass' };

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'e1',
    taskId: 100,
    taskName: 'Task e1',
    proceso: { proceso: 100, nombre: 'Desarrollo' },
    date: '2026-06-10',
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    description: 'Description e1',
    createdAt: '2026-06-10T09:00:00Z',
    updatedAt: '2026-06-10T09:00:00Z',
    synced: false,
    ...overrides,
  };
}

interface SetupOptions {
  entries?: TimeEntry[];
  selectedIds?: Set<string>;
}

function setup({ entries = [], selectedIds = new Set<string>() }: SetupOptions = {}) {
  const markSynced = vi.fn().mockResolvedValue(undefined);
  const onEntriesSynced = vi.fn();

  const utils = renderHook(() =>
    useEntrySync({ entries, selectedIds, markSynced, onEntriesSynced })
  );

  return { ...utils, markSynced, onEntriesSynced };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(dbConfig.get).mockReturnValue(FULL_DB_CONFIG);
  vi.mocked(wizardConfig.get).mockReturnValue({
    usuario: 'MG01',
    fase: '1',
    tipoHora: '11',
    encoding: 'utf8',
  });
});

describe('useEntrySync', () => {
  it('arranca con el panel de sincronización cerrado', () => {
    const { result } = setup();

    expect(result.current.syncPanelOpen).toBe(false);
  });

  it('abre y cierra el panel de sincronización', () => {
    const { result } = setup();

    act(() => {
      result.current.setSyncPanelOpen(true);
    });
    expect(result.current.syncPanelOpen).toBe(true);

    act(() => {
      result.current.setSyncPanelOpen(false);
    });
    expect(result.current.syncPanelOpen).toBe(false);
  });

  it('alterna el panel con el actualizador funcional que usa la página', () => {
    const { result } = setup();

    act(() => {
      result.current.setSyncPanelOpen((prev) => !prev);
    });
    expect(result.current.syncPanelOpen).toBe(true);

    act(() => {
      result.current.setSyncPanelOpen((prev) => !prev);
    });
    expect(result.current.syncPanelOpen).toBe(false);
  });

  it('expone como pendientes sólo los Registros no sincronizados', () => {
    const { result } = setup({
      entries: [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2', synced: true })],
    });

    expect(result.current.pendingEntries.map((e) => e.id)).toEqual(['e1']);
  });

  it('sin selección, sincroniza todos los pendientes', () => {
    const { result } = setup({
      entries: [
        makeEntry({ id: 'e1' }),
        makeEntry({ id: 'e2' }),
        makeEntry({ id: 'e3', synced: true }),
      ],
    });

    expect(result.current.entriesToSync.map((e) => e.id)).toEqual(['e1', 'e2']);
  });

  it('con selección, sincroniza sólo los pendientes seleccionados', () => {
    const { result } = setup({
      entries: [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' }), makeEntry({ id: 'e3' })],
      selectedIds: new Set(['e2', 'e3']),
    });

    expect(result.current.entriesToSync.map((e) => e.id)).toEqual(['e2', 'e3']);
  });

  it('ignora en la selección los Registros ya sincronizados', () => {
    const { result } = setup({
      entries: [makeEntry({ id: 'e1', synced: true }), makeEntry({ id: 'e2' })],
      selectedIds: new Set(['e1']),
    });

    expect(result.current.entriesToSync).toEqual([]);
  });

  it('excluye del sync los Registros de una tarea local (taskId negativo) y los reporta aparte', () => {
    const { result } = setup({
      entries: [
        makeEntry({ id: 'e1' }),
        makeEntry({ id: 'e2', taskId: -1, proceso: { proceso: -1, nombre: 'Tarea local' } }),
      ],
    });

    expect(result.current.entriesToSync.map((e) => e.id)).toEqual(['e1']);
    expect(result.current.pendingEntries.map((e) => e.id)).toEqual(['e1', 'e2']);
    expect(result.current.blockedEntries.map((e) => e.id)).toEqual(['e2']);
  });

  it('no sincroniza un Registro de tarea local ni cuando se pide explícitamente', async () => {
    const entry = makeEntry({ id: 'e1', taskId: -1, proceso: { proceso: -1, nombre: 'Tarea local' } });
    const { result, markSynced } = setup({ entries: [entry] });

    await act(async () => {
      await result.current.handleSyncEntry(entry);
    });

    expect(syncTimeEntries).not.toHaveBeenCalled();
    expect(markSynced).not.toHaveBeenCalled();
  });

  it('sin configuración de base de datos no sincroniza y avisa', async () => {
    vi.mocked(dbConfig.get).mockReturnValue({ server: '', database: '', username: '', password: '' });
    const entry = makeEntry({ id: 'e1' });
    const { result, markSynced, onEntriesSynced } = setup({ entries: [entry] });

    await act(async () => {
      await result.current.handleSyncEntry(entry);
    });

    expect(syncTimeEntries).not.toHaveBeenCalled();
    expect(markSynced).not.toHaveBeenCalled();
    expect(onEntriesSynced).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Falta configuración de base de datos');
  });

  it('sincroniza un Registro con la configuración y el usuario actuales', async () => {
    vi.mocked(syncTimeEntries).mockResolvedValue({
      success: true,
      results: [{ entryId: 'e1', success: true }],
    });
    const entry = makeEntry({ id: 'e1' });
    const { result, markSynced, onEntriesSynced } = setup({ entries: [entry] });

    await act(async () => {
      await result.current.handleSyncEntry(entry);
    });

    expect(syncTimeEntries).toHaveBeenCalledWith([entry], FULL_DB_CONFIG, 'MG01');
    expect(markSynced).toHaveBeenCalledWith(['e1']);
    expect(onEntriesSynced).toHaveBeenCalledWith(['e1']);
    expect(toast.success).toHaveBeenCalledWith('Sincronizado: Task e1');
  });

  it('usa un usuario vacío cuando la configuración del wizard falla', async () => {
    vi.mocked(wizardConfig.get).mockImplementation(() => {
      throw new Error('sin configuración');
    });
    vi.mocked(syncTimeEntries).mockResolvedValue({
      success: true,
      results: [{ entryId: 'e1', success: true }],
    });
    const entry = makeEntry({ id: 'e1' });
    const { result } = setup({ entries: [entry] });

    await act(async () => {
      await result.current.handleSyncEntry(entry);
    });

    expect(syncTimeEntries).toHaveBeenCalledWith([entry], FULL_DB_CONFIG, '');
  });

  it('sólo marca como sincronizados los ids que tuvieron éxito', async () => {
    vi.mocked(syncTimeEntries).mockResolvedValue({
      success: true,
      results: [
        { entryId: 'e1', success: true },
        { entryId: 'e2', success: false, error: 'boom' },
      ],
    });
    const entry = makeEntry({ id: 'e1' });
    const { result, markSynced, onEntriesSynced } = setup({ entries: [entry] });

    await act(async () => {
      await result.current.handleSyncEntry(entry);
    });

    expect(markSynced).toHaveBeenCalledWith(['e1']);
    expect(onEntriesSynced).toHaveBeenCalledWith(['e1']);
  });

  it('ante un fallo de sincronización avisa con el error y no marca nada', async () => {
    vi.mocked(syncTimeEntries).mockResolvedValue({
      success: false,
      results: [{ entryId: 'e1', success: false, error: 'SQL caído' }],
    });
    const entry = makeEntry({ id: 'e1' });
    const { result, markSynced, onEntriesSynced } = setup({ entries: [entry] });

    await act(async () => {
      await result.current.handleSyncEntry(entry);
    });

    expect(markSynced).not.toHaveBeenCalled();
    expect(onEntriesSynced).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Error al sincronizar: SQL caído');
  });

  it('ante un fallo sin detalle avisa con el error genérico', async () => {
    vi.mocked(syncTimeEntries).mockResolvedValue({ success: false, results: [] });
    const entry = makeEntry({ id: 'e1' });
    const { result } = setup({ entries: [entry] });

    await act(async () => {
      await result.current.handleSyncEntry(entry);
    });

    expect(toast.error).toHaveBeenCalledWith('Error al sincronizar: Error desconocido');
  });

  it('no marca nada cuando la respuesta es exitosa pero ninguna entrada lo fue', async () => {
    vi.mocked(syncTimeEntries).mockResolvedValue({
      success: true,
      results: [{ entryId: 'e1', success: false, error: 'rechazado' }],
    });
    const entry = makeEntry({ id: 'e1' });
    const { result, markSynced } = setup({ entries: [entry] });

    await act(async () => {
      await result.current.handleSyncEntry(entry);
    });

    expect(markSynced).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Error al sincronizar: rechazado');
  });
});
