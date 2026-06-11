import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TimeTrackingPage } from '../TimeTrackingPage';
import { useTimer } from '../../hooks/useTimer';
import { useTimeEntries } from '../../hooks/useTimeEntries';
import { detectCrossing } from '../../lib/timerCrossingDetector';
import { toast } from 'sonner';
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

function makeEntry(id: string, dateOverride?: string): TimeEntry {
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
    synced: false,
  };
}

function setupTimerRunning(elapsed = 2557) {
  const now = new Date();
  const startTime = new Date(now.getTime() - elapsed * 1000);

  vi.mocked(useTimer).mockReturnValue({
    timerState: {
      isRunning: true,
      taskId: 42,
      taskName: 'Diseño API',
      startTime: startTime.toISOString(),
      elapsed,
      description: 'Revisión de endpoints',
    },
    isRunning: true,
    elapsed,
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
    updateStartTime: vi.fn(),
    updateDescription: vi.fn(),
  });

  vi.mocked(useTimeEntries).mockReturnValue({
    entries: [],
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

function setupTimerNotRunning(entries: TimeEntry[] = []) {
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

describe('TimeTrackingPage — timer row in list', () => {
  it('shows TimerRow when timer is running and today is in the period', () => {
    setupTimerRunning(2557);
    renderWithProviders(<TimeTrackingPage />);

    // TimerRow should show the task name (appears in TimeTrackerBar AND TimerRow)
    const taskMatches = screen.getAllByText('Diseño API');
    expect(taskMatches.length).toBeGreaterThanOrEqual(2);
    // TimerRow should show "En curso" badge
    expect(screen.getByText('En curso')).toBeInTheDocument();
  });

  it('includes timer elapsed in period total', () => {
    setupTimerRunning(2557);
    renderWithProviders(<TimeTrackingPage />);

    // 2557 seconds = 00:42:37. It appears in TimeTrackerBar AND in period total.
    const matches = screen.getAllByText('00:42:37');
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('does not show TimerRow when timer is not running', () => {
    setupTimerNotRunning();
    renderWithProviders(<TimeTrackingPage />);

    expect(screen.queryByText('Diseño API')).not.toBeInTheDocument();
    expect(screen.queryByText('En curso')).not.toBeInTheDocument();
  });

  it('shows task name in the page when timer is running', () => {
    setupTimerRunning(2557);
    renderWithProviders(<TimeTrackingPage />);

    // The task name appears in the TimeTrackerBar (disabled button) AND in the TimerRow
    const matches = screen.getAllByText('Diseño API');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
