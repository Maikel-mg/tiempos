import { useCallback, useMemo, useState } from 'react';
import { computePeriodTotal } from '../lib/computePeriodTotal';
import { resolvePeriodRange, type ResolvedPeriodRange } from '../lib/periodRange';
import { formatDurationHMS } from '@/lib/format';
import type { PeriodType, DateRange } from '@/components/shared/PeriodSelector';
import type { TimeEntry } from '../types';

export interface UsePeriodFilterParams {
  entries: TimeEntry[];
  /** Tiempo transcurrido del timer en curso, para el total del período. */
  timerElapsed: number;
}

/**
 * Filtro de período del time tracker: tipo de período, rango personalizado,
 * pestaña activa, entradas del período, "hoy dentro del rango" y total.
 *
 * Sólo orquesta los helpers puros (`resolvePeriodRange`, `computePeriodTotal`) y
 * `formatDurationHMS`; el comportamiento es el mismo que tenía la página.
 */
export function usePeriodFilter({ entries, timerElapsed }: UsePeriodFilterParams) {
  const [period, setPeriod] = useState<PeriodType>('week');
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('table');

  const periodRange: ResolvedPeriodRange = useMemo(
    () => resolvePeriodRange(period, customRange),
    [period, customRange],
  );

  const filteredByPeriod = useMemo(
    () => entries.filter((e) => e.date >= periodRange.startStr && e.date <= periodRange.endStr),
    [entries, periodRange],
  );

  const todayInRange = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return todayStr >= periodRange.startStr && todayStr <= periodRange.endStr;
  }, [periodRange]);

  const periodTotal = useMemo(
    () => computePeriodTotal(filteredByPeriod, timerElapsed, todayInRange),
    [filteredByPeriod, timerElapsed, todayInRange],
  );

  const periodTotalDisplay = useMemo(() => formatDurationHMS(periodTotal), [periodTotal]);

  const handlePeriodChange = useCallback((newPeriod: PeriodType, newCustomRange?: DateRange) => {
    setPeriod(newPeriod);
    if (newCustomRange) {
      setCustomRange(newCustomRange);
    }
  }, []);

  return {
    period,
    customRange,
    activeTab,
    setActiveTab,
    periodRange,
    filteredByPeriod,
    todayInRange,
    periodTotal,
    periodTotalDisplay,
    handlePeriodChange,
  };
}
