import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TimeTrackingPage } from '../TimeTrackingPage';
import { useTimer } from '../../hooks/useTimer';
import { useTimeEntries } from '../../hooks/useTimeEntries';
import { toast } from 'sonner';
import type { TimeEntry } from '../../types';

// Mock pointer capture for Radix UI Select in jsdom
Element.prototype.hasPointerCapture = vi.fn(() => false);

vi.mock('../../hooks/useTimer');
vi.mock('../../hooks/useTimeEntries');
vi.mock('../../lib/timerCrossingDetector', () => ({
  detectCrossing: () => ({ crossed: false }),
}));
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
  }),
  Toaster: () => null,
}));

// Mock ProcessSelector (used inside TaskProposalModal)
vi.mock('@/features/process-management/components/ProcessSelector', () => ({
  ProcessSelector: ({ open, onSelect }: { open: boolean; onSelect: (projectCode: string, processId: string) => void }) => {
    if (!open) return null;
    return (
      <div data-testid="process-selector">
        <button onClick={() => onSelect('IPKWEB', '123')}>Select</button>
      </div>
    );
  },
}));

vi.mock('@/lib/task-mapping-storage', () => ({
  updateMapping: vi.fn(),
}));

vi.mock('@/components/SQLPreviewModal', () => ({
  SQLPreviewModal: () => null,
}));

vi.mock('@/features/process-management/mutations/useCreateProcess', () => ({
  useCreateProcess: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    data: null,
    error: null,
  })),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

function currentMonthDate(day: number): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const GENERIC_TASK = 'IPKWEB 2026-06. Errores';
const DESCRIPTION = 'Corrección de bugs en módulo de reportes';

function makeGenericEntry(
  id: string,
  durationSeconds: number,
  opts: { synced?: boolean; day?: number; description?: string } = {}
): TimeEntry {
  const day = opts.day ?? 10;
  const date = currentMonthDate(day);
  return {
    id,
    taskId: 100,
    taskName: GENERIC_TASK,
    proceso: { proceso: 100, nombre: GENERIC_TASK },
    date,
    startTime: '09:00',
    endTime: '18:00',
    duration: durationSeconds,
    description: opts.description ?? DESCRIPTION,
    createdAt: `${date}T09:00:00Z`,
    updatedAt: `${date}T09:00:00Z`,
    synced: opts.synced ?? false,
  };
}

const mockUpdateEntry = vi.fn().mockResolvedValue(null);

function setupMocks(entries: TimeEntry[]) {
  vi.mocked(useTimer).mockReturnValue({
    timerState: null,
    isRunning: false,
    elapsed: 0,
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
    updateStartTime: vi.fn(),
    updateDescription: vi.fn(),
  });

  vi.mocked(useTimeEntries).mockReturnValue({
    entries,
    loading: false,
    createEntry: vi.fn(),
    updateEntry: mockUpdateEntry,
    deleteEntry: vi.fn(),
    markSynced: vi.fn(),
    refresh: vi.fn(),
    getEntriesByDateRange: vi.fn(),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TaskProposals acceptance integration', () => {
  describe('proposal indicator visibility based on threshold', () => {
    it('shows proposal indicator when entries exceed 8h threshold', () => {
      // 3 entries × 3h each = 9h > 8h → proposal should appear
      const entries = [
        makeGenericEntry('e1', 3 * 3600, { day: 5 }),
        makeGenericEntry('e2', 3 * 3600, { day: 6 }),
        makeGenericEntry('e3', 3 * 3600, { day: 7 }),
      ];
      setupMocks(entries);

      renderWithProviders(<TimeTrackingPage />);

      expect(screen.getByRole('button', { name: /propuesta/ })).toBeInTheDocument();
    });

    it('hides proposal indicator when entries sum below threshold', () => {
      // 3 entries × 2h each = 6h < 8h → no proposal
      const entries = [
        makeGenericEntry('e1', 2 * 3600, { day: 5 }),
        makeGenericEntry('e2', 2 * 3600, { day: 6 }),
        makeGenericEntry('e3', 2 * 3600, { day: 7 }),
      ];
      setupMocks(entries);

      renderWithProviders(<TimeTrackingPage />);

      expect(screen.queryByRole('button', { name: /propuesta/ })).not.toBeInTheDocument();
    });
  });

  describe('modal opens on indicator click', () => {
    it('opens TaskProposalModal when proposal indicator is clicked', async () => {
      const user = userEvent.setup();
      const entries = [
        makeGenericEntry('e1', 3 * 3600, { day: 5 }),
        makeGenericEntry('e2', 3 * 3600, { day: 6 }),
        makeGenericEntry('e3', 3 * 3600, { day: 7 }),
      ];
      setupMocks(entries);

      renderWithProviders(<TimeTrackingPage />);

      // Proposal indicator should be visible
      const indicator = screen.getByRole('button', { name: /propuesta/ });
      expect(indicator).toBeInTheDocument();

      // Click the indicator to open modal
      await user.click(indicator);

      // Modal should open with the title "Seleccionar ID de Tarea"
      await waitFor(() => {
        expect(screen.getByText('Seleccionar ID de Tarea')).toBeInTheDocument();
      });
    });
  });

  describe('acceptance reassigns entries', () => {
    it('reassigns only non-synced entries and skips synced ones', async () => {
      const user = userEvent.setup();

      // 3 entries: 2 unsynced (e1, e2), 1 synced (e3). Total 9h > 8h
      const entries = [
        makeGenericEntry('e1', 3 * 3600, { day: 5, synced: false }),
        makeGenericEntry('e2', 3 * 3600, { day: 6, synced: false }),
        makeGenericEntry('e3', 3 * 3600, { day: 7, synced: true }),
      ];
      setupMocks(entries);

      renderWithProviders(<TimeTrackingPage />);

      // Open the modal
      const indicator = screen.getByRole('button', { name: /propuesta/ });
      await user.click(indicator);

      await waitFor(() => {
        expect(screen.getByText('Seleccionar ID de Tarea')).toBeInTheDocument();
      });

      // Click "Seleccionar Proceso" to trigger the acceptance flow
      const selectBtn = screen.getByRole('button', { name: 'Seleccionar Proceso' });
      await user.click(selectBtn);

      // The mocked ProcessSelector should appear and provide a process ID
      const processOption = screen.getByText('Select');
      await user.click(processOption);

      // Wait for the handler to process
      await waitFor(() => {
        // updateEntry should be called for e1 and e2 (non-synced), but NOT for e3 (synced)
        expect(mockUpdateEntry).toHaveBeenCalledTimes(2);
      });

      // Verify the correct entries were updated
      expect(mockUpdateEntry).toHaveBeenCalledWith(
        'e1',
        expect.objectContaining({
          taskId: 123,
          taskName: expect.any(String),
        })
      );
      expect(mockUpdateEntry).toHaveBeenCalledWith(
        'e2',
        expect.objectContaining({
          taskId: 123,
          taskName: expect.any(String),
        })
      );

      // Verify synced entry (e3) was NOT updated
      expect(mockUpdateEntry).not.toHaveBeenCalledWith(
        'e3',
        expect.anything()
      );
    });
  });

  describe('toast feedback', () => {
    it('shows success toast with reassigned entry count', async () => {
      const user = userEvent.setup();

      const entries = [
        makeGenericEntry('e1', 3 * 3600, { day: 5, synced: false }),
        makeGenericEntry('e2', 3 * 3600, { day: 6, synced: false }),
        makeGenericEntry('e3', 3 * 3600, { day: 7, synced: true }),
      ];
      setupMocks(entries);

      renderWithProviders(<TimeTrackingPage />);

      // Open modal
      const indicator = screen.getByRole('button', { name: /propuesta/ });
      await user.click(indicator);

      await waitFor(() => {
        expect(screen.getByText('Seleccionar ID de Tarea')).toBeInTheDocument();
      });

      // Trigger acceptance
      const selectBtn = screen.getByRole('button', { name: 'Seleccionar Proceso' });
      await user.click(selectBtn);
      const processOption = screen.getByText('Select');
      await user.click(processOption);

      // Wait for the toast
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('2 entrada(s) reasignada(s)')
        );
      });
    });

    it('shows info toast when all entries in proposal are already synced', async () => {
      const user = userEvent.setup();

      // All entries synced → toReassign will be empty
      const entries = [
        makeGenericEntry('e1', 3 * 3600, { day: 5, synced: true }),
        makeGenericEntry('e2', 3 * 3600, { day: 6, synced: true }),
        makeGenericEntry('e3', 3 * 3600, { day: 7, synced: true }),
      ];
      setupMocks(entries);

      renderWithProviders(<TimeTrackingPage />);

      // Card should still appear (extractor doesn't check synced status)
      const indicator = screen.getByRole('button', { name: /propuesta/ });
      expect(indicator).toBeInTheDocument();

      await user.click(indicator);

      await waitFor(() => {
        expect(screen.getByText('Seleccionar ID de Tarea')).toBeInTheDocument();
      });

      const selectBtn = screen.getByRole('button', { name: 'Seleccionar Proceso' });
      await user.click(selectBtn);
      const processOption = screen.getByText('Select');
      await user.click(processOption);

      // Should show "no entries to reassign" info toast
      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith(
          'No hay entradas pendientes para reasignar'
        );
      });
    });
  });
});
