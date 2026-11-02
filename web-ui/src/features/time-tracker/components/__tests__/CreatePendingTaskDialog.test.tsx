import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatePendingTaskDialog } from '../CreatePendingTaskDialog';
import { getLocalTask, materializeLocalTask } from '../../services/localTasksService';

const { mockOnTaskChange } = vi.hoisted(() => ({ mockOnTaskChange: vi.fn() }));

vi.mock('@/components/SinFasesSelector', () => ({
  SinFasesSelector: ({ onTaskChange, disabled }: any) => (
    <div data-testid="sin-fases-selector">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          mockOnTaskChange({ fase: 'DES' });
          onTaskChange({ fase: 'DES' });
        }}
      >
        Elegir fase
      </button>
    </div>
  ),
}));

vi.mock('../../services/localTasksService', () => ({
  materializeLocalTask: vi.fn(),
  getLocalTask: vi.fn(),
}));

const LOCAL_TASK = {
  proceso: -1,
  nombre: 'Tarea sin conexión',
  dto: {
    nombre: 'Tarea sin conexión',
    fechaInicio: '01/10/2026',
    fechaFin: '31/10/2026',
    fechaEstimacion: '01/10/2026',
    minutos: 60,
    usuario: 'MG01',
    fase: '',
  },
  creadoEn: '2026-10-01T09:00:00Z',
};

vi.mock('@/config/stores', () => ({
  wizardConfig: { get: () => ({ usuario: 'MG01', fase: '' }) },
}));

describe('CreatePendingTaskDialog', () => {
  const onOpenChange = vi.fn();
  const onCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLocalTask).mockResolvedValue(LOCAL_TASK as never);
  });

  const renderDialog = (proceso: number | null = -1) =>
    render(
      <CreatePendingTaskDialog
        proceso={proceso}
        nombre="Tarea sin conexión"
        onOpenChange={onOpenChange}
        onCreated={onCreated}
      />
    );

  it('no permite crear hasta que se elige una fase con el árbol de la BD', () => {
    renderDialog();

    expect(screen.getByText('Crear «Tarea sin conexión» en la base de datos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Crear tarea$/i })).toBeDisabled();
  });

  it('crea la tarea con la fase elegida y avisa para recargar la lista', async () => {
    vi.mocked(materializeLocalTask).mockResolvedValue({ movidos: 3 });
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Elegir fase' }));
    const createButton = screen.getByRole('button', { name: /^Crear tarea$/i });
    await waitFor(() => expect(createButton).toBeEnabled());
    fireEvent.click(createButton);

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(materializeLocalTask).toHaveBeenCalledWith(-1, {
      fase: 'DES',
      fechaInicio: '01/10/2026',
      fechaFin: '31/10/2026',
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('no permite crear si la tarea guardada trae una fecha que no existe', async () => {
    vi.mocked(getLocalTask).mockResolvedValue({
      ...LOCAL_TASK,
      dto: { ...LOCAL_TASK.dto, fechaFin: '31/11/2026' },
    } as never);
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Elegir fase' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Fin previsto')).toHaveValue('31/11/2026')
    );
    expect(screen.getByRole('button', { name: /^Crear tarea$/i })).toBeDisabled();
  });

  it('si falla, muestra el error y no cierra el diálogo', async () => {
    vi.mocked(materializeLocalTask).mockRejectedValue(new Error('El SP no devolvió el id de la tarea creada'));
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Elegir fase' }));
    const createButton = screen.getByRole('button', { name: /^Crear tarea$/i });
    await waitFor(() => expect(createButton).toBeEnabled());
    fireEvent.click(createButton);

    expect(await screen.findByText('El SP no devolvió el id de la tarea creada')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(onCreated).not.toHaveBeenCalled();
  });
});
