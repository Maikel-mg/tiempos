import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BalanceDrilldownSheet } from '../BalanceDrilldownSheet';
import type { UseBalanceBreakdownResult } from '../../hooks/useBalanceBreakdown';
import type { BalanceRow } from '../../lib/balance';

const ROWS: BalanceRow[] = [
  { date: '2026-06-08', worked: 32400, target: 29700, delta: 2700 },
  { date: '2026-06-09', worked: 18000, target: 25200, delta: -7200 },
];

function makeBreakdown(
  overrides: Partial<UseBalanceBreakdownResult> = {},
): UseBalanceBreakdownResult {
  return {
    scope: 'period',
    setScope: vi.fn(),
    signFilter: 'all',
    setSignFilter: vi.fn(),
    from: '2026-06-08',
    to: '2026-06-14',
    setFrom: vi.fn(),
    setTo: vi.fn(),
    total: -1800,
    rows: ROWS,
    filteredRows: ROWS,
    visibleTotal: -1800,
    ...overrides,
  };
}

describe('BalanceDrilldownSheet', () => {
  it('muestra el filtro Todos/Positivos/Negativos y avisa del signo elegido', () => {
    const breakdown = makeBreakdown();
    render(<BalanceDrilldownSheet open onOpenChange={vi.fn()} breakdown={breakdown} />);

    expect(screen.getByTestId('balance-total')).toHaveTextContent('-0:30');
    expect(screen.getByText('· período seleccionado')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Positivos' }));
    expect(breakdown.setSignFilter).toHaveBeenCalledWith('positive');

    fireEvent.click(screen.getByRole('button', { name: 'Negativos' }));
    expect(breakdown.setSignFilter).toHaveBeenCalledWith('negative');

    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(breakdown.setSignFilter).toHaveBeenCalledWith('all');
  });

  it('los inputs Desde y Hasta avisan del cambio de fecha', () => {
    const breakdown = makeBreakdown();
    render(<BalanceDrilldownSheet open onOpenChange={vi.fn()} breakdown={breakdown} />);

    expect(screen.getByLabelText('Desde')).toHaveValue('2026-06-08');
    expect(screen.getByLabelText('Hasta')).toHaveValue('2026-06-14');

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-06-09' } });
    expect(breakdown.setFrom).toHaveBeenCalledWith('2026-06-09');

    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-06-10' } });
    expect(breakdown.setTo).toHaveBeenCalledWith('2026-06-10');
  });

  it('lista las filas del desglose con fecha, trabajado, objetivo y delta', () => {
    render(<BalanceDrilldownSheet open onOpenChange={vi.fn()} breakdown={makeBreakdown()} />);

    expect(screen.getByText('Lun 8 Jun')).toBeInTheDocument();
    expect(screen.getByText('9:00')).toBeInTheDocument();
    expect(screen.getByText('8:15')).toBeInTheDocument();
    expect(screen.getByText('+0:45')).toBeInTheDocument();

    expect(screen.getByText('Mar 9 Jun')).toBeInTheDocument();
    expect(screen.getByText('5:00')).toBeInTheDocument();
    expect(screen.getByText('7:00')).toBeInTheDocument();
    expect(screen.getByText('-2:00')).toBeInTheDocument();
  });

  it('distingue "sin datos de balance" de "sin entradas con este filtro"', () => {
    const { unmount } = render(
      <BalanceDrilldownSheet
        open
        onOpenChange={vi.fn()}
        breakdown={makeBreakdown({ rows: [], filteredRows: [], total: 0, visibleTotal: 0 })}
      />,
    );
    expect(screen.getByText('No hay datos de balance disponibles.')).toBeInTheDocument();
    unmount();

    render(
      <BalanceDrilldownSheet
        open
        onOpenChange={vi.fn()}
        breakdown={makeBreakdown({ filteredRows: [] })}
      />,
    );
    expect(screen.getByText('No hay entradas con este filtro.')).toBeInTheDocument();
    expect(
      screen.queryByText('No hay datos de balance disponibles.'),
    ).not.toBeInTheDocument();
  });
});
