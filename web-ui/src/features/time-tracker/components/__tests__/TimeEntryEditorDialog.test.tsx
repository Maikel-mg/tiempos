import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeEntryEditorDialog } from '../TimeEntryEditorDialog';
import type { TimeEntry, Proceso } from '../../types';

const mockUseProcessCache = vi.fn();

vi.mock('../../hooks/useProcessCache', () => ({
  useProcessCache: () => mockUseProcessCache(),
}));

const processes: Proceso[] = [
  { proceso: 101, nombre: 'Desarrollo Frontend', departamentoId: 5 },
];

const entry: TimeEntry = {
  id: 'entry-1',
  taskId: 101,
  taskName: 'Desarrollo Frontend',
  proceso: processes[0],
  date: '2026-06-05',
  startTime: '10:00',
  endTime: '11:30',
  duration: 5400,
  description: 'Trabajo existente',
  recoverable: false,
  createdAt: '2026-06-05T10:00:00.000Z',
  updatedAt: '2026-06-05T10:00:00.000Z',
  synced: false,
};

function setup() {
  mockUseProcessCache.mockReturnValue({
    processes,
    loading: false,
    error: null,
    refresh: vi.fn(),
  });
}

describe('TimeEntryEditorDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setup();
  });

  it('shows existing entry data in edit mode', () => {
    render(
      <TimeEntryEditorDialog
        open
        mode="edit"
        entry={entry}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /editar registro de tiempo/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Trabajo existente')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-06-05')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('11:30')).toBeInTheDocument();
  });

  it('permite editar un registro de una tarea local (taskId negativo)', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <TimeEntryEditorDialog
        open
        mode="edit"
        entry={{ ...entry, taskId: -1, taskName: 'Tarea local', proceso: { proceso: -1, nombre: 'Tarea local' } }}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByRole('button', { name: /guardar/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /tarea local/i })).toBeInTheDocument();
  });

  it('submits a new manual entry with the editor fields', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <TimeEntryEditorDialog
        open
        mode="create"
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole('button', { name: /seleccionar proceso/i }));
    await user.click(await screen.findByText('Desarrollo Frontend'));
    await user.type(screen.getByLabelText('Descripción'), 'Nuevo trabajo');
    await user.type(screen.getByLabelText('Fin'), '1700');
    await user.click(screen.getByRole('button', { name: /crear registro/i }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      taskId: 101,
      taskName: 'Desarrollo Frontend',
      startTime: '09:00',
      endTime: '17:00',
      description: 'Nuevo trabajo',
    }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not submit or close when opening the process selector in edit mode', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <TimeEntryEditorDialog
        open
        mode="edit"
        entry={entry}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole('button', { name: /desarrollo frontend/i }));
    await screen.findByPlaceholderText(/buscar por nombre/i);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('asks before discarding dirty changes', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <TimeEntryEditorDialog
        open
        mode="edit"
        entry={entry}
        onOpenChange={onOpenChange}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );

    await user.type(screen.getByLabelText('Descripción'), ' cambiado');
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(window.confirm).toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});

describe('TimeEntryEditorDialog — aviso de cuadre con los marcajes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setup();
  });

  const franjas = [
    { start: '06:35', end: '13:30' },
    { start: '15:15', end: '16:13' },
  ];

  /** Aviso real: la franja del día y la corrección de los horarios del formulario. */
  function evaluarMarcaje(form: { startTime: string; endTime: string }) {
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };
    const start = toMinutes(form.startTime);
    const end = toMinutes(form.endTime);
    const franja = franjas.find((f) => start >= toMinutes(f.start) && end <= toMinutes(f.end)) ?? franjas[0];

    const fixes: Array<{ label: string; patch: { startTime?: string; endTime?: string } }> = [];
    if (start > toMinutes(franja.start)) fixes.push({ label: `Ampliar inicio a ${franja.start}`, patch: { startTime: franja.start } });
    if (end < toMinutes(franja.end)) fixes.push({ label: `Ampliar fin a ${franja.end}`, patch: { endTime: franja.end } });

    return { franjas, fixes };
  }

  it('muestra la franja fichada del día aunque el Registro cuadre', () => {
    render(
      <TimeEntryEditorDialog
        open
        mode="edit"
        entry={{ ...entry, startTime: '06:35', endTime: '13:30' }}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        evaluarMarcaje={evaluarMarcaje}
      />
    );

    expect(screen.getByText('Fichado: 06:35–13:30 · 15:15–16:13')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ampliar/ })).not.toBeInTheDocument();
  });

  it('un Registro fuera de la franja muestra el aviso con el botón de ajuste exacto', () => {
    render(
      <TimeEntryEditorDialog
        open
        mode="edit"
        entry={entry}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        evaluarMarcaje={evaluarMarcaje}
      />
    );

    expect(screen.getByText(/no cuadra con tu franja fichada/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ampliar inicio a 06:35' })).toBeInTheDocument();
  });

  it('los botones de ajuste dejan el Registro dentro de la franja', async () => {
    render(
      <TimeEntryEditorDialog
        open
        mode="edit"
        entry={entry}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        evaluarMarcaje={evaluarMarcaje}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Ampliar inicio a 06:35' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ampliar fin a 13:30' }));

    expect(screen.getByLabelText('Inicio')).toHaveValue('06:35');
    expect(screen.getByLabelText('Fin')).toHaveValue('13:30');
    // Ya cubre su franja: el aviso desaparece.
    expect(screen.queryByText(/no cuadra con tu franja fichada/)).not.toBeInTheDocument();
  });

  it('guardar sigue funcionando igual con el aviso visible, sin confirmación ni bloqueo', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <TimeEntryEditorDialog
        open
        mode="edit"
        entry={entry}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        evaluarMarcaje={evaluarMarcaje}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /Guardar cambios/ }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ startTime: '10:00', endTime: '11:30' });
  });

  it('sin franja conocida no se muestra ningún aviso', () => {
    render(
      <TimeEntryEditorDialog
        open
        mode="edit"
        entry={entry}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        evaluarMarcaje={() => null}
      />
    );

    expect(screen.queryByText(/Fichado:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/no cuadra con tu franja fichada/)).not.toBeInTheDocument();
  });
});
