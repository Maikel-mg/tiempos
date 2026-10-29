import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BulkReassignDialog } from '../BulkReassignDialog';
import type { Proceso } from '../../types';

const TAREA: Proceso = { proceso: 555, nombre: 'Tarea destino' };

// Se sustituye el selector real (lista procesos) por un botón que elige una tarea.
vi.mock('../ProcessSelectorButton', () => ({
  ProcessSelectorButton: ({ onChange }: { onChange: (p: Proceso) => void }) => (
    <button type="button" onClick={() => onChange({ proceso: 555, nombre: 'Tarea destino' })}>
      Elegir tarea
    </button>
  ),
}));

describe('BulkReassignDialog', () => {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDialog = (count = 3, skippedSyncedCount = 0) =>
    render(
      <BulkReassignDialog
        open
        onOpenChange={onOpenChange}
        count={count}
        skippedSyncedCount={skippedSyncedCount}
        onConfirm={onConfirm}
      />
    );

  it('no permite confirmar hasta elegir tarea', () => {
    renderDialog();

    expect(screen.getByText('Cambiar tarea de 3 registros')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Cambiar tarea$/i })).toBeDisabled();
  });

  it('confirma con la tarea elegida', async () => {
    onConfirm.mockResolvedValue(undefined);
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Elegir tarea' }));
    const confirmButton = screen.getByRole('button', { name: /^Cambiar tarea$/i });
    await waitFor(() => expect(confirmButton).toBeEnabled());
    fireEvent.click(confirmButton);

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(TAREA));
  });

  it('avisa cuántos registros sincronizados se quedan sin cambiar', () => {
    renderDialog(3, 2);

    expect(
      screen.getByText(/Los 2 registros ya sincronizados no se cambian/i)
    ).toBeInTheDocument();
  });
});
