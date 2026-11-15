import { useCallback, useMemo, useState } from 'react';
import { computeBalanceBreakdown } from '../lib/balance';
import type { BalanceRow } from '../lib/balance';
import { toLocalDateString } from '../lib/localDate';
import type { ResolvedPeriodRange } from '../lib/periodRange';
import type { TimeEntry } from '../types';

/** Alcance del balance: período seleccionado o histórico completo. */
export type BalanceScope = 'period' | 'global';
/** Filtro por signo del delta diario. */
export type BalanceSignFilter = 'all' | 'positive' | 'negative';

export interface UseBalanceBreakdownParams {
  entries: TimeEntry[];
  /** Rango del período activo (límites inclusivos). */
  periodRange: ResolvedPeriodRange;
  /** Segundos transcurridos del timer en curso (0 si no corre). */
  timerElapsed?: number;
  /** Fecha de hoy (YYYY-MM-DD); inyectable para tests. */
  today?: string;
}

export interface UseBalanceBreakdownResult {
  scope: BalanceScope;
  setScope: (scope: BalanceScope) => void;
  signFilter: BalanceSignFilter;
  setSignFilter: (filter: BalanceSignFilter) => void;
  /** Límite inferior del desglose; vacío = sin límite (alcance histórico). */
  from: string;
  /** Límite superior del desglose; vacío = sin límite (alcance histórico). */
  to: string;
  setFrom: (date: string) => void;
  setTo: (date: string) => void;
  /** Total de la card del balance (= suma de `rows`). */
  total: number;
  rows: BalanceRow[];
  filteredRows: BalanceRow[];
  /** Suma de las filas visibles (rango + signo aplicados). */
  visibleTotal: number;
}

/**
 * Estado y derivados del desglose del Balance. Sin render: el panel sólo pinta.
 *
 * El alcance `period` usa el rango del período activo; `global` usa todo el
 * histórico (igual que `computeBanco`) y deja el rango de fechas sin límite.
 */
export function useBalanceBreakdown({
  entries,
  periodRange,
  timerElapsed = 0,
  today = toLocalDateString(),
}: UseBalanceBreakdownParams): UseBalanceBreakdownResult {
  const [scope, setScopeState] = useState<BalanceScope>('period');
  const [signFilter, setSignFilter] = useState<BalanceSignFilter>('all');
  // null = rango por defecto del alcance; se reinicia al cambiar de alcance
  // para que volver a «Período» restaure el rango del período activo.
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string } | null>(null);

  const { startStr, endStr } = periodRange;

  const setScope = useCallback((next: BalanceScope) => {
    setScopeState(next);
    setDateFilter(null);
  }, []);

  const from = dateFilter?.from ?? (scope === 'period' ? startStr : '');
  const to = dateFilter?.to ?? (scope === 'period' ? endStr : '');

  const setFrom = useCallback((next: string) => setDateFilter({ from: next, to }), [to]);
  const setTo = useCallback((next: string) => setDateFilter({ from, to: next }), [from]);

  const breakdown = useMemo(
    () =>
      scope === 'period'
        ? computeBalanceBreakdown(entries, startStr, endStr, timerElapsed, today)
        : computeBalanceBreakdown(entries, '', '', timerElapsed, today),
    [entries, scope, startStr, endStr, timerElapsed, today],
  );

  const filteredRows = useMemo(() => {
    let rows = breakdown.rows;
    if (from) rows = rows.filter((row) => row.date >= from);
    if (to) rows = rows.filter((row) => row.date <= to);
    if (signFilter === 'positive') rows = rows.filter((row) => row.delta > 0);
    else if (signFilter === 'negative') rows = rows.filter((row) => row.delta < 0);
    return rows;
  }, [breakdown.rows, from, to, signFilter]);

  const visibleTotal = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.delta, 0),
    [filteredRows],
  );

  return {
    scope,
    setScope,
    signFilter,
    setSignFilter,
    from,
    to,
    setFrom,
    setTo,
    total: breakdown.total,
    rows: breakdown.rows,
    filteredRows,
    visibleTotal,
  };
}
