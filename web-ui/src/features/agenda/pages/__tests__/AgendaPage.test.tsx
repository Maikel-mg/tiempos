import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('AgendaPage — período navegable', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-06-10T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('las flechas mueven el día y saltan el fin de semana', async () => {
    mockSession([entry('a', '2026-06-15', '09:00', '10:00', 'Del lunes')]);
    const { container } = renderPage();

    await userEvent.click(screen.getByLabelText('Período anterior'));
    expect(container.textContent).toContain('martes 9 jun 2026');

    for (let click = 0; click < 4; click++) {
      await userEvent.click(screen.getByLabelText('Período siguiente'));
    }
    expect(container.textContent).toContain('lunes 15 jun 2026');
    expect(container.textContent).toContain('Del lunes');
    expect(container.textContent).not.toContain('sábado');
    expect(container.textContent).not.toContain('domingo');
  });

  it('el modo semana muestra solo de lunes a viernes', async () => {
    mockSession([entry('a', '2026-06-10', '09:00', '10:00', 'Del miércoles')]);
    const { container } = renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Semana' }));

    expect(container.textContent).toContain('8 – 12 jun');
    expect(container.textContent).toContain('Lun 8');
    expect(container.textContent).toContain('Vie 12');
    expect(container.textContent).not.toContain('Sáb');
    expect(container.textContent).not.toContain('Dom');
  });

  it('el botón de hoy vuelve al día laborable actual', async () => {
    mockSession([]);
    const { container } = renderPage();

    await userEvent.click(screen.getByLabelText('Período siguiente'));
    await userEvent.click(screen.getByRole('button', { name: 'Hoy' }));

    expect(container.textContent).toContain('miércoles 10 jun 2026');
  });

  it('el salto a fecha abre el día elegido y su semana', async () => {
    mockSession([entry('a', '2026-06-19', '09:00', '10:00', 'Del viernes 19')]);
    const { container } = renderPage();

    fireEvent.change(screen.getByLabelText('Ir a fecha'), { target: { value: '2026-06-19' } });
    expect(container.textContent).toContain('viernes 19 jun 2026');

    await userEvent.click(screen.getByRole('button', { name: 'Semana' }));
    expect(container.textContent).toContain('15 – 19 jun');
  });
});
