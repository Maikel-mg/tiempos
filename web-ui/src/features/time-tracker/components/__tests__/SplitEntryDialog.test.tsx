import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SplitEntryDialog } from '../SplitEntryDialog';
import type { TimeEntry } from '../../types';

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'entry-1',
    taskId: 100,
    taskName: 'Desarrollo',
    proceso: { proceso: 100, nombre: 'Desarrollo' },
    date: '2026-01-15',
    startTime: '09:00',
    endTime: '12:00',
    duration: 10800,
    description: 'Revisión',
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
    synced: false,
    ...overrides,
  };
}

function renderDialog(entry: TimeEntry, onConfirm = vi.fn().mockResolvedValue(undefined)) {
  render(
    <SplitEntryDialog open entry={entry} onOpenChange={vi.fn()} onConfirm={onConfirm} />,
  );
  return { onConfirm };
}

describe('SplitEntryDialog', () => {
  it('muestra las dos mitades con sus horarios y duraciones', () => {
    renderDialog(makeEntry());

    expect(screen.getByText('Mitad 1')).toBeInTheDocument();
    expect(screen.getByText('Mitad 2')).toBeInTheDocument();
    expect(screen.getAllByText('1 h 30 min')).toHaveLength(2);
    expect(screen.getByText('09:00 – 10:30')).toBeInTheDocument();
    expect(screen.getByText('10:30 – 12:00')).toBeInTheDocument();
  });

  it('arranca con el corte a la mitad del Registro', () => {
    renderDialog(makeEntry());

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '10:30');
  });

  it('confirma el corte elegido, sin construir las mitades', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog(makeEntry());

    await user.click(screen.getByRole('button', { name: 'Dividir' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({
      entryId: 'entry-1',
      cutTime: '10:30',
      // Sin tocar nada, ambas mitades heredan la descripción del Registro.
      firstDescription: 'Revisión',
      secondDescription: 'Revisión',
    });
  });

  it('arranca con la descripción del Registro en las dos mitades', () => {
    renderDialog(makeEntry());

    expect(screen.getByLabelText('Descripción de la primera mitad')).toHaveValue('Revisión');
    expect(screen.getByLabelText('Descripción de la segunda mitad')).toHaveValue('Revisión');
  });

  it('envía una descripción distinta para cada mitad', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog(makeEntry());

    const first = screen.getByLabelText('Descripción de la primera mitad');
    await user.clear(first);
    await user.type(first, 'Revisión de endpoints');

    const second = screen.getByLabelText('Descripción de la segunda mitad');
    await user.clear(second);
    await user.type(second, 'Maquetación');

    await user.click(screen.getByRole('button', { name: 'Dividir' }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        firstDescription: 'Revisión de endpoints',
        secondDescription: 'Maquetación',
      }),
    );
  });

  it('no dispara los atajos al escribir en una descripción', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog(makeEntry());

    // "m" centraría el corte, "e" abriría el campo de la hora y Enter confirmaría
    // si los atajos escucharan a los campos de texto.
    await user.type(screen.getByLabelText('Descripción de la primera mitad'), 'me');
    await user.keyboard('{Enter}');

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '10:30');
    expect(screen.queryByLabelText('Hora del corte')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('persiste una descripción vacía si se borra el campo', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog(makeEntry());

    await user.clear(screen.getByLabelText('Descripción de la primera mitad'));
    await user.click(screen.getByRole('button', { name: 'Dividir' }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ firstDescription: '', secondDescription: 'Revisión' }),
    );
  });

  it('deshabilita la confirmación y explica el motivo cuando el Registro es demasiado corto', () => {
    renderDialog(makeEntry({ startTime: '09:00', endTime: '09:01' }));

    expect(screen.getByRole('button', { name: 'Dividir' })).toBeDisabled();
    expect(screen.getByText(/menos de 2 minutos no se puede dividir/)).toBeInTheDocument();
  });

  it('mueve el corte un minuto con las flechas', async () => {
    const user = userEvent.setup();
    renderDialog(makeEntry());

    await user.click(screen.getByRole('slider'));
    await user.keyboard('{ArrowRight}{ArrowRight}');

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '10:32');
  });

  it('mueve el corte cinco minutos con Shift y las flechas', async () => {
    const user = userEvent.setup();
    renderDialog(makeEntry());

    await user.click(screen.getByRole('slider'));
    await user.keyboard('{Shift>}{ArrowLeft}{/Shift}');

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '10:25');
  });

  it('divide a la mitad con la tecla M', async () => {
    const user = userEvent.setup();
    renderDialog(makeEntry());

    await user.click(screen.getByRole('slider'));
    await user.keyboard('{ArrowRight}');
    await user.keyboard('m');

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '10:30');
  });

  it('abre el campo de la hora del corte con la tecla E y lo aplica con Enter', async () => {
    const user = userEvent.setup();
    renderDialog(makeEntry());

    await user.click(screen.getByRole('slider'));
    await user.keyboard('e');
    const field = screen.getByLabelText('Hora del corte');

    await user.clear(field);
    await user.type(field, '11:00');
    await user.keyboard('{Enter}');

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '11:00');
  });

  it('no aplica el campo con Escape', async () => {
    const user = userEvent.setup();
    renderDialog(makeEntry());

    await user.click(screen.getByRole('slider'));
    await user.keyboard('e');
    const field = screen.getByLabelText('Hora del corte');

    await user.clear(field);
    await user.type(field, '11:00');
    await user.keyboard('{Escape}');

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '10:30');
  });

  it('avisa de que la segunda mitad sigue corriendo cuando es el timer activo', () => {
    render(
      <SplitEntryDialog open live entry={makeEntry()} onOpenChange={vi.fn()} onConfirm={vi.fn()} />,
    );

    expect(screen.getByText('Dividir el timer en curso')).toBeInTheDocument();
    expect(screen.getByText(/Primera mitad \(se guarda ahora\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dividir y seguir' })).toBeInTheDocument();
  });
});
