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
