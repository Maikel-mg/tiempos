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

  it('confirma las dos mitades con los horarios del corte', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog(makeEntry());

    await user.click(screen.getByRole('button', { name: 'Dividir' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const { first, second } = onConfirm.mock.calls[0][0];
    expect(first).toMatchObject({ id: 'entry-1', startTime: '09:00', endTime: '10:30' });
    expect(second).toMatchObject({ startTime: '10:30', endTime: '12:00' });
    expect(second.id).not.toBe('entry-1');
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
