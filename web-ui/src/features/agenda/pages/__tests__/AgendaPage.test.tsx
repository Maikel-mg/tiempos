import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AgendaPage } from '../AgendaPage';
import { useTimeEntries } from '@/features/time-tracker/hooks/useTimeEntries';
import { useTimer } from '@/features/time-tracker/hooks/useTimer';
import type { TimeEntry } from '@/features/time-tracker/types';

vi.mock('@/features/time-tracker/hooks/useTimeEntries');
vi.mock('@/features/time-tracker/hooks/useTimer');

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function entry(id: string, date: string, startTime: string, endTime: string, taskName: string, description?: string): TimeEntry {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  return {
    id,
    taskId: 10,
    taskName,
    proceso: { proceso: 10, nombre: taskName },
    date,
    startTime,
    endTime,
    duration: ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) * 60,
    description,
    synced: false,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  };
}

function mockSession(entries: TimeEntry[]) {
  vi.mocked(useTimeEntries).mockReturnValue({
    entries,
    loading: false,
    createEntry: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
    splitEntry: vi.fn(),
    splitRunningTimer: vi.fn(),
    markSynced: vi.fn(),
  } as unknown as ReturnType<typeof useTimeEntries>);
  vi.mocked(useTimer).mockReturnValue({
    isRunning: false,
    elapsed: 0,
    timerState: null,
    start: vi.fn(),
    stop: vi.fn(),
    updateStartTime: vi.fn(),
    updateDescription: vi.fn(),
    cancel: vi.fn(),
  } as unknown as ReturnType<typeof useTimer>);
}

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <AgendaPage />
    </QueryClientProvider>,
  );
}

describe('AgendaPage — Timeline del día laborable', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-06-10T10:00:00')); // miércoles
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('abre el día de hoy y pinta sus Registros de tiempo', () => {
    mockSession([
      entry('a', '2026-06-10', '09:30', '11:00', 'Clasificador', 'Detección de duplicados'),
      entry('b', '2026-06-10', '11:15', '12:00', 'Revisión de PR'),
      entry('c', '2026-06-09', '09:00', '10:00', 'Otro día'),
    ]);

    const { container } = renderPage();

    // El título del período y la cabecera de la columna muestran el mismo día.
    expect(screen.getAllByText(/miércoles 10 jun 2026/i).length).toBeGreaterThan(0);
    expect(container.textContent).toContain('Clasificador');
    expect(container.textContent).toContain('Detección de duplicados');
    expect(container.textContent).toContain('Revisión de PR');
    // El día anterior no entra en la vista de hoy.
    expect(container.textContent).not.toContain('Otro día');
    expect(container.textContent).toContain('2 registros');
  });

  it('el eje horario arranca en la Hora de entrada configurada', () => {
    mockSession([entry('a', '2026-06-10', '09:45', '11:00', 'Clasificador')]);

    const { container } = renderPage();

    // La Hora de entrada por defecto de Settings es 09:00.
    expect(container.textContent).toContain('09:00');
    expect(container.textContent).not.toContain('08:00');
  });

  it('abre el viernes cuando hoy es fin de semana', () => {
    vi.setSystemTime(new Date('2026-06-13T10:00:00')); // sábado
    mockSession([entry('a', '2026-06-12', '09:00', '10:00', 'Del viernes')]);

    const { container } = renderPage();

    expect(container.textContent).toContain('viernes 12 jun 2026');
    expect(container.textContent).toContain('Del viernes');
  });
});
