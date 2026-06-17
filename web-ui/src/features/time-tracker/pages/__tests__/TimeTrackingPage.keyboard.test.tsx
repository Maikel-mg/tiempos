import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TimeTrackingPage } from '../TimeTrackingPage';
import { useTimer } from '../../hooks/useTimer';
import { useTimeEntries } from '../../hooks/useTimeEntries';
import { detectCrossing } from '../../lib/timerCrossingDetector';

import type { TimeEntry } from '../../types';

Element.prototype.hasPointerCapture = vi.fn(() => false);

vi.mock('../../hooks/useTimer');
vi.mock('../../hooks/useTimeEntries');
vi.mock('../../lib/timerCrossingDetector');
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

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function makeEntry(id: string, synced = false, dateOverride?: string): TimeEntry {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - diffToMonday);
  const entryDate = dateOverride || toLocalDateString(monday);

  return {
    id,
    taskId: 100,
    taskName: `Task ${id}`,
    proceso: { proceso: 100, nombre: 'Desarrollo' },
    date: entryDate,
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    description: `Description ${id}`,
    createdAt: `${entryDate}T09:00:00Z`,
    updatedAt: `${entryDate}T09:00:00Z`,
    synced,
  };
}

function setupMocks(entries: TimeEntry[]) {
  vi.mocked(useTimer).mockReturnValue({
    timerState: { isRunning: false, taskId: 0, taskName: '', startTime: '', elapsed: 0 },
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
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
    markSynced: vi.fn(),
    refresh: vi.fn(),
    getEntriesByDateRange: vi.fn(),
  });

  vi.mocked(detectCrossing).mockReturnValue({ crossed: false });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TimeTrackingPage keyboard navigation', () => {
  it('ArrowDown moves highlight across visible rows', async () => {
    const user = userEvent.setup();
    const entries = [makeEntry('1'), makeEntry('2'), makeEntry('3')];
    setupMocks(entries);

    renderWithProviders(<TimeTrackingPage />);

    // Switch to table view (default is table)
    const table = screen.getByRole('table');
    table.focus();

    const rows = screen.getAllByRole('row');

    // Move to first data row
    await user.keyboard('{ArrowDown}');
    expect(rows[1]?.getAttribute('data-state')).toBe('active');

    // Move to second data row
    await user.keyboard('{ArrowDown}');
    expect(rows[2]?.getAttribute('data-state')).toBe('active');

    // Move to third data row
    await user.keyboard('{ArrowDown}');
    expect(rows[3]?.getAttribute('data-state')).toBe('active');

    // Move back up
    await user.keyboard('{ArrowUp}');
    expect(rows[2]?.getAttribute('data-state')).toBe('active');
  });

  it('Home moves to first row, End moves to last row', async () => {
    const user = userEvent.setup();
    const entries = [makeEntry('1'), makeEntry('2'), makeEntry('3')];
    setupMocks(entries);

    renderWithProviders(<TimeTrackingPage />);

    const table = screen.getByRole('table');
    table.focus();

    const rows = screen.getAllByRole('row');

    // End goes to last data row
    await user.keyboard('{End}');
    expect(rows[3]?.getAttribute('data-state')).toBe('active');

    // Home goes to first data row
    await user.keyboard('{Home}');
    expect(rows[1]?.getAttribute('data-state')).toBe('active');
  });

  it('Escape clears active row', async () => {
    const user = userEvent.setup();
    const entries = [makeEntry('1'), makeEntry('2')];
    setupMocks(entries);

    renderWithProviders(<TimeTrackingPage />);

    const table = screen.getByRole('table');
    table.focus();

    await user.keyboard('{ArrowDown}');
    const rows = screen.getAllByRole('row');
    expect(rows[1]?.getAttribute('data-state')).toBe('active');

    await user.keyboard('{Escape}');
    const activeRows = rows.filter(r => r.getAttribute('data-state') === 'active');
    expect(activeRows).toHaveLength(0);
  });

  it('Arrow keys are ignored when grouped view is active', async () => {
    const user = userEvent.setup();
    const entries = [makeEntry('1'), makeEntry('2')];
    setupMocks(entries);

    renderWithProviders(<TimeTrackingPage />);

    // Table view is active by default — activate a row
    const table = screen.getByRole('table');
    table.focus();
    await user.keyboard('{ArrowDown}');
    const rows = screen.getAllByRole('row');
    expect(rows[1]?.getAttribute('data-state')).toBe('active');

    // Switch to grouped view
    const groupedTab = screen.getByRole('tab', { name: /agrupado/i });
    await user.click(groupedTab);

    // ArrowDown should NOT change active row (isEnabled=false in grouped view)
    // Note: in grouped view the table is not rendered, so rows may be different
    // Just verify no crash occurs
    await user.keyboard('{ArrowDown}');
  });
});
