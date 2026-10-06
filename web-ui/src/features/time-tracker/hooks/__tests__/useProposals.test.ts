import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useProposals } from '../useProposals';
import { toast } from 'sonner';
import { proposalConfig } from '@/config/stores';
import type { TimeEntry } from '../../types';
import type { TaskProposal } from '@/domain/proposals/task-proposal';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

vi.mock('@/config/stores', () => ({
  proposalConfig: { get: vi.fn() },
}));

const GENERIC_TASK = 'IPKWEB 2026-06. Errores';
const DESCRIPTION = 'Corrección de bugs en módulo de reportes';

/** Fecha del mes actual: el extractor sólo considera el mes en curso. */
function currentMonthDate(day: number): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  const date = overrides.date ?? currentMonthDate(10);
  return {
    id: 'e1',
    taskId: 100,
    taskName: GENERIC_TASK,
    proceso: { proceso: 100, nombre: GENERIC_TASK },
    date,
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    description: DESCRIPTION,
    createdAt: `${date}T09:00:00Z`,
    updatedAt: `${date}T09:00:00Z`,
    synced: false,
    ...overrides,
  };
}

function makeProposal(overrides: Partial<TaskProposal> = {}): TaskProposal {
  return {
    description: DESCRIPTION,
    genericTask: GENERIC_TASK,
    totalHours: 9,
    proposedName: `${GENERIC_TASK} reasignada`,
    projectCode: 'IPKWEB',
    period: '2026-06',
    fechaInicio: currentMonthDate(5),
    fechaFin: currentMonthDate(7),
    entryCount: 2,
    entryIds: ['e1', 'e2'],
    entries: [],
    ...overrides,
  };
}

interface SetupOptions {
  entries?: TimeEntry[];
}

function setup({ entries = [] }: SetupOptions = {}) {
  const updateEntry = vi.fn().mockResolvedValue(null);

  const utils = renderHook(() => useProposals({ entries, updateEntry }));

  return { ...utils, updateEntry };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(proposalConfig.get).mockReturnValue({ thresholdHours: 8 });
});

describe('useProposals', () => {
  it('arranca con el modal de propuestas cerrado', () => {
    const { result } = setup();

    expect(result.current.proposalModalOpen).toBe(false);
  });

  it('abre y cierra el modal de propuestas', () => {
    const { result } = setup();

    act(() => {
      result.current.setProposalModalOpen(true);
    });
    expect(result.current.proposalModalOpen).toBe(true);

    act(() => {
      result.current.setProposalModalOpen(false);
    });
    expect(result.current.proposalModalOpen).toBe(false);
  });

  it('extrae las propuestas de las entradas del mes actual por encima del umbral', () => {
    const { result } = setup({
      entries: [
        makeEntry({ id: 'e1', duration: 3 * 3600, date: currentMonthDate(5) }),
        makeEntry({ id: 'e2', duration: 3 * 3600, date: currentMonthDate(6) }),
        makeEntry({ id: 'e3', duration: 3 * 3600, date: currentMonthDate(7) }),
      ],
    });

    expect(result.current.proposals).toHaveLength(1);
    expect(result.current.proposals[0].entryIds).toEqual(['e1', 'e2', 'e3']);
  });

  it('no propone nada cuando las horas del grupo no superan el umbral', () => {
    const { result } = setup({
      entries: [
        makeEntry({ id: 'e1', duration: 2 * 3600, date: currentMonthDate(5) }),
        makeEntry({ id: 'e2', duration: 2 * 3600, date: currentMonthDate(6) }),
        makeEntry({ id: 'e3', duration: 2 * 3600, date: currentMonthDate(7) }),
      ],
    });

    expect(result.current.proposals).toEqual([]);
  });

  it('ignora las entradas de meses anteriores aunque superen el umbral', () => {
    const { result } = setup({
      entries: [
        makeEntry({ id: 'e1', duration: 5 * 3600, date: '2020-01-05' }),
        makeEntry({ id: 'e2', duration: 5 * 3600, date: '2020-01-06' }),
      ],
    });

    expect(result.current.proposals).toEqual([]);
  });

  it('respeta el umbral configurado en proposalConfig', () => {
    vi.mocked(proposalConfig.get).mockReturnValue({ thresholdHours: 20 });
    const { result } = setup({
      entries: [
        makeEntry({ id: 'e1', duration: 3 * 3600, date: currentMonthDate(5) }),
        makeEntry({ id: 'e2', duration: 3 * 3600, date: currentMonthDate(6) }),
        makeEntry({ id: 'e3', duration: 3 * 3600, date: currentMonthDate(7) }),
      ],
    });

    expect(result.current.proposals).toEqual([]);
  });

  it('ante un ID de proceso inválido avisa y no reasigna nada', async () => {
    const proposal = makeProposal();
    const { result, updateEntry } = setup({
      entries: [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })],
    });

    await act(async () => {
      await result.current.handleAcceptProposal(proposal, proposal.proposedName, 'no-numerico');
    });

    expect(updateEntry).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('ID de proceso inválido');
  });

  it('reasigna sólo las entradas no sincronizadas del grupo propuesto', async () => {
    const proposal = makeProposal();
    const synced = makeEntry({ id: 'e2', synced: true });
    const { result, updateEntry } = setup({
      entries: [makeEntry({ id: 'e1' }), synced, makeEntry({ id: 'e9' })],
    });

    await act(async () => {
      await result.current.handleAcceptProposal(proposal, proposal.proposedName, '123');
    });

    expect(updateEntry).toHaveBeenCalledTimes(1);
    expect(updateEntry).toHaveBeenCalledWith('e1', {
      taskId: 123,
      taskName: proposal.proposedName,
      proceso: { proceso: 123, nombre: proposal.proposedName },
    });
  });

  it('sin entradas pendientes avisa y no reasigna nada', async () => {
    const proposal = makeProposal();
    const { result, updateEntry } = setup({
      entries: [makeEntry({ id: 'e1', synced: true }), makeEntry({ id: 'e2', synced: true })],
    });

    await act(async () => {
      await result.current.handleAcceptProposal(proposal, proposal.proposedName, '123');
    });

    expect(updateEntry).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith('No hay entradas pendientes para reasignar');
  });

  it('avisa del número de entradas reasignadas al terminar', async () => {
    const proposal = makeProposal();
    const { result } = setup({
      entries: [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })],
    });

    await act(async () => {
      await result.current.handleAcceptProposal(proposal, proposal.proposedName, '123');
    });

    expect(toast.success).toHaveBeenCalledWith(
      `2 entrada(s) reasignada(s) a "${proposal.proposedName}"`,
    );
  });

  it('ante un fallo de persistencia avisa con el error', async () => {
    const proposal = makeProposal();
    const { result, updateEntry } = setup({
      entries: [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })],
    });
    updateEntry.mockRejectedValueOnce(new Error('SQL caído'));

    await act(async () => {
      await result.current.handleAcceptProposal(proposal, proposal.proposedName, '123');
    });

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Error al reasignar entradas: SQL caído');
  });
});
