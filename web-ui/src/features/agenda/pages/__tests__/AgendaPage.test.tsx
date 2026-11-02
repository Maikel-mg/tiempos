import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AgendaPage } from '../AgendaPage';
import { InlineComposer } from '../../components/InlineComposer';
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
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <AgendaPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('AgendaPage — Timeline del día laborable', () => {
  beforeEach(() => {
    localStorage.clear();
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

  it('el eje horario arranca en la Hora de entrada configurada', async () => {
    mockSession([entry('a', '2026-06-10', '09:45', '11:00', 'Clasificador')]);

    const { container } = renderPage();
    await userEvent.click(screen.getByRole('tab', { name: 'Timeline' }));

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
    localStorage.clear();
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

    await userEvent.click(screen.getByRole('tab', { name: 'Timeline' }));
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

    await userEvent.click(screen.getByRole('tab', { name: 'Timeline' }));
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

describe('AgendaPage — vista Agenda, píldoras y preferencias', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-06-10T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const dayEntries = () => [
    entry('a', '2026-06-10', '09:00', '10:00', 'Clasificador', 'Detección de duplicados al reimportar el CSV'),
    entry('b', '2026-06-10', '10:30', '11:00', 'Revisión de PR'),
  ];

  it('abre en Agenda por defecto y muestra la descripción completa y los huecos', () => {
    mockSession(dayEntries());

    const { container } = renderPage();

    expect(screen.getByRole('tab', { name: 'Agenda' })).toHaveAttribute('aria-selected', 'true');
    expect(container.textContent).toContain('Detección de duplicados al reimportar el CSV');
    expect(container.textContent).toContain('30m sin registrar');
    expect(container.textContent).toContain('Sin descripción');
  });

  it('las píldoras cambian de vista sin cambiar el período', async () => {
    mockSession(dayEntries());
    const { container } = renderPage();

    await userEvent.click(screen.getByLabelText('Período siguiente'));
    expect(container.textContent).toContain('jueves 11 jun 2026');

    await userEvent.click(screen.getByRole('tab', { name: 'Timeline' }));
    expect(container.textContent).toContain('jueves 11 jun 2026');
    expect(screen.getByRole('tab', { name: 'Timeline' })).toHaveAttribute('aria-selected', 'true');
  });

  it('recuerda la vista y el modo entre sesiones', async () => {
    mockSession(dayEntries());
    const first = renderPage();

    await userEvent.click(screen.getByRole('tab', { name: 'Timeline' }));
    await userEvent.click(screen.getByRole('button', { name: 'Semana' }));
    first.unmount();

    const second = renderPage();
    expect(screen.getByRole('tab', { name: 'Timeline' })).toHaveAttribute('aria-selected', 'true');
    expect(second.container.textContent).toContain('8 – 12 jun');
  });

  it('un día sin Registros de tiempo explica cómo empezar', () => {
    mockSession([]);

    const { container } = renderPage();

    expect(container.textContent).toContain('No hay Registros de tiempo en este período');
  });
});

describe('AgendaPage — vista Calendario por Tarea', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-06-10T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const laneEntries = () => [
    entry('a', '2026-06-10', '09:00', '10:00', 'Corta'),
    entry('b', '2026-06-10', '10:00', '13:00', 'Larga'),
    entry('c', '2026-06-09', '09:00', '11:00', 'Larga'),
  ];

  it('muestra una fila por Tarea ordenada de mayor a menor tiempo', async () => {
    mockSession(laneEntries());
    const { container } = renderPage();

    await userEvent.click(screen.getByRole('tab', { name: 'Calendario' }));

    const text = container.textContent ?? '';
    expect(text.indexOf('Larga')).toBeLessThan(text.indexOf('Corta'));
    // En modo día solo cuentan los Registros de tiempo de hoy.
    expect(text).toContain('3h 0m');
    expect(text).toContain('1h 0m');
  });

  it('en modo semana reparte por día laborable sin fin de semana', async () => {
    mockSession(laneEntries());
    const { container } = renderPage();

    await userEvent.click(screen.getByRole('tab', { name: 'Calendario' }));
    await userEvent.click(screen.getByRole('button', { name: 'Semana' }));

    expect(container.textContent).toContain('Lun 8');
    expect(container.textContent).toContain('Vie 12');
    expect(container.textContent).not.toContain('Sáb');
    expect(container.textContent).not.toContain('Dom');
  });

  it('sin Registros de tiempo explica para qué sirve la vista', async () => {
    mockSession([]);
    const { container } = renderPage();

    await userEvent.click(screen.getByRole('tab', { name: 'Calendario' }));

    expect(container.textContent).toContain('reparte el tiempo por Tarea');
  });
});

describe('AgendaPage — Timer activo', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-06-10T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  function mockRunningTimer() {
    mockSession([entry('a', '2026-06-10', '08:00', '09:00', 'Registro previo')]);
    vi.mocked(useTimer).mockReturnValue({
      isRunning: true,
      elapsed: 3600,
      timerState: {
        isRunning: true,
        taskId: 99,
        taskName: 'Timer en curso',
        startTime: new Date(2026, 5, 10, 9, 0, 0).toISOString(),
        elapsed: 3600,
      },
      start: vi.fn(),
      stop: vi.fn(),
      updateStartTime: vi.fn(),
      updateDescription: vi.fn(),
      cancel: vi.fn(),
    } as unknown as ReturnType<typeof useTimer>);
  }

  it('se pinta como bloque vivo en las tres vistas', async () => {
    mockRunningTimer();
    const { container } = renderPage();

    for (const pill of ['Agenda', 'Timeline', 'Calendario']) {
      await userEvent.click(screen.getByRole('tab', { name: pill }));
      expect(container.textContent).toContain('Timer en curso');
      expect(container.textContent).toContain('en curso');
    }
  });

  it('no abre el editor al pulsarlo', async () => {
    mockRunningTimer();
    const { container } = renderPage();

    await userEvent.click(screen.getByRole('tab', { name: 'Timeline' }));
    const live = Array.from(container.querySelectorAll('[role="button"]')).find((node) =>
      node.textContent?.includes('Timer en curso'),
    );
    expect(live).toBeDefined();
    await userEvent.click(live as HTMLElement);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('no aparece si su día no es el visible', async () => {
    mockRunningTimer();
    mockSession([entry('a', '2026-06-09', '08:00', '09:00', 'Otro día')]);
    vi.mocked(useTimer).mockReturnValue({
      isRunning: true,
      elapsed: 3600,
      timerState: {
        isRunning: true,
        taskId: 99,
        taskName: 'Timer en curso',
        startTime: new Date(2026, 5, 10, 9, 0, 0).toISOString(),
        elapsed: 3600,
      },
      start: vi.fn(),
      stop: vi.fn(),
      updateStartTime: vi.fn(),
      updateDescription: vi.fn(),
      cancel: vi.fn(),
    } as unknown as ReturnType<typeof useTimer>);
    const { container } = renderPage();

    await userEvent.click(screen.getByLabelText('Período siguiente'));
    // La barra del Timer lo sigue mostrando, pero las vistas del plan no.
    expect(container.textContent).not.toContain('timer activo');
  });
});

describe('AgendaPage — alta manual en línea', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-06-10T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('abre el compositor con las horas del hueco pulsado', async () => {
    mockSession([
      entry('a', '2026-06-10', '09:00', '10:00', 'Clasificador'),
      entry('b', '2026-06-10', '10:30', '11:00', 'Revisión'),
    ]);
    renderPage();

    await userEvent.click(screen.getByText(/30m sin registrar/));

    expect(screen.getByLabelText('Hora de inicio')).toHaveValue('10:00');
    expect(screen.getByLabelText('Hora de fin')).toHaveValue('10:30');
  });

  it('guarda el Registro de tiempo con la Tarea y las horas del compositor', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <QueryClientProvider client={queryClient}>
        <InlineComposer
          date="2026-06-10"
          startTime="10:00"
          endTime="10:30"
          preset={{ proceso: 7, nombre: 'Clasificador' }}
          onCancel={() => {}}
          onSubmit={onSubmit}
        />
      </QueryClientProvider>,
    );

    await userEvent.type(screen.getByLabelText('Descripción del Registro de tiempo'), 'Repasar PRDs');
    fireEvent.keyDown(screen.getByLabelText('Descripción del Registro de tiempo'), { key: 'Enter' });

    expect(onSubmit).toHaveBeenCalledWith({
      taskId: 7,
      taskName: 'Clasificador',
      date: '2026-06-10',
      startTime: '10:00',
      endTime: '10:30',
      description: 'Repasar PRDs',
    });
  });

  it('no deja guardar sin Tarea elegida', () => {
    mockSession([entry('a', '2026-06-10', '09:00', '10:00', 'Clasificador')]);
    renderPage();

    fireEvent.keyDown(window, { key: 'n' });

    expect(screen.getByRole('button', { name: /Guardar/i })).toBeDisabled();
  });

  it('el atajo N abre el compositor al final del día visible', async () => {
    mockSession([entry('a', '2026-06-10', '09:00', '11:30', 'Clasificador')]);
    renderPage();

    fireEvent.keyDown(window, { key: 'n' });

    expect(screen.getByLabelText('Hora de inicio')).toHaveValue('11:30');
  });
});

describe('AgendaPage — acciones por Registro de tiempo', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-06-10T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  async function openMenu(taskName: string) {
    await userEvent.click(screen.getByRole('button', { name: `Acciones de ${taskName}` }));
  }

  it('ofrece las acciones de la tabla y abre el editor', async () => {
    mockSession([entry('a', '2026-06-10', '09:00', '10:00', 'Clasificador')]);
    renderPage();

    await openMenu('Clasificador');

    expect(screen.getByRole('menuitem', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Play' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Duplicar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Dividir' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Sincronizar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Eliminar' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('menuitem', { name: 'Editar' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('explica por qué no se puede dividir un Registro de tiempo sincronizado', async () => {
    mockSession([{ ...entry('a', '2026-06-10', '09:00', '10:00', 'Clasificador'), synced: true }]);
    renderPage();

    await openMenu('Clasificador');

    expect(screen.getByRole('menuitem', { name: /Dividir · ya sincronizado/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    // Sincronizado: la acción no se ofrece.
    expect(screen.queryByRole('menuitem', { name: 'Sincronizar' })).not.toBeInTheDocument();
  });
});

describe('AgendaPage — sincronizar el día', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-06-10T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('solo ofrece el botón cuando hay pendientes y cuenta los del día', () => {
    mockSession([entry('a', '2026-06-10', '09:00', '10:00', 'Pendiente')]);
    const { container } = renderPage();

    expect(container.textContent).toContain('Sincronizar día (1)');
  });

  it('no aparece si todo el día está sincronizado', () => {
    mockSession([{ ...entry('a', '2026-06-10', '09:00', '10:00', 'Hecho'), synced: true }]);
    const { container } = renderPage();

    expect(container.textContent).not.toContain('Sincronizar día');
  });

  it('abre el panel de sincronización existente', async () => {
    mockSession([entry('a', '2026-06-10', '09:00', '10:00', 'En la base de datos')]);
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /Sincronizar día/i }));

    // El título del panel cuenta lo que se va a sincronizar.
    expect(await screen.findByText(/Sincronizar 1 registros/i)).toBeInTheDocument();
  });
});
