import { useMemo, useState } from 'react';
import { Clock, Calendar, Landmark, CalendarDays } from 'lucide-react';
import { resolvePeriodRange } from '../lib/periodRange';
import type { ResolvedPeriodRange } from '../lib/periodRange';
import { toLocalDateString } from '../lib/localDate';
import { formatHM } from '../lib/progressFormat';
import { computePeriodProgress } from '../lib/progressStats';
import { useBalanceBreakdown } from '../hooks/useBalanceBreakdown';
import { ProgressCardRow } from './ProgressCardRow';
import type { CardData } from './ProgressCardRow';
import { BalanceScopeToggle } from './BalanceScopeToggle';
import { BalanceDrilldownSheet } from './BalanceDrilldownSheet';
import type { TimeEntry } from '../types';
import type { PeriodType } from '@/components/shared/PeriodSelector';

export interface PeriodProgressPanelProps {
  entries: TimeEntry[];
  period: PeriodType;
  /** Resolved selected period range. Falls back to resolvePeriodRange(period). */
  periodRange?: ResolvedPeriodRange;
  /** Elapsed seconds from a running timer (throttled). Added to today/week/month worked. */
  timerElapsed?: number;
  /** Whether today falls within the selected period range. */
  todayInRange?: boolean;
}

export function PeriodProgressPanel({
  entries,
  period,
  periodRange,
  timerElapsed = 0,
  todayInRange = false,
}: PeriodProgressPanelProps) {
  const todayStr = toLocalDateString();

  const range = useMemo(
    () => periodRange ?? resolvePeriodRange(period),
    [periodRange, period],
  );

  // Timer elapsed only counts when today is in the selected period range
  const elapsed = todayInRange ? timerElapsed : 0;

  const progress = useMemo(
    () => computePeriodProgress(entries, { today: todayStr, elapsed }),
    [entries, todayStr, elapsed],
  );

  const [balanceSheetOpen, setBalanceSheetOpen] = useState(false);

  const balance = useBalanceBreakdown({
    entries,
    periodRange: range,
    timerElapsed: elapsed,
    today: todayStr,
  });

  const cards: CardData[] = [
    {
      icon: Clock,
      label: 'Hoy',
      segmentTestId: 'segment-hoy',
      barTestId: 'bar-hoy',
      workedStr: formatHM(progress.hoy.worked),
      subtext: progress.hoy.subtext,
      accentClass: progress.hoy.accentClass,
      percent: progress.hoy.percent,
    },
    {
      icon: Calendar,
      label: 'Semana',
      segmentTestId: 'segment-semana',
      barTestId: 'bar-semana',
      workedStr: formatHM(progress.semana.worked),
      subtext: progress.semana.subtext,
      accentClass: progress.semana.accentClass,
      percent: progress.semana.percent,
    },
    {
      icon: CalendarDays,
      label: 'Mes',
      segmentTestId: 'segment-mes',
      barTestId: 'bar-mes',
      workedStr: formatHM(progress.mes.worked),
      subtext: progress.mes.subtext,
      accentClass: progress.mes.accentClass,
      percent: progress.mes.percent,
    },
    {
      icon: Landmark,
      label: 'Balance',
      segmentTestId: 'segment-balance',
      barTestId: 'bar-balance',
      workedStr: formatHM(Math.abs(balance.total)),
      subtext: balance.total >= 0 ? 'horas a favor' : 'horas en contra',
      accentClass: balance.total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : '',
      percent: balance.total >= 0 ? 100 : 0,
      onClick: () => setBalanceSheetOpen(true),
      headerAction: <BalanceScopeToggle scope={balance.scope} onChange={balance.setScope} />,
    },
  ];

  return (
    <>
      <ProgressCardRow cards={cards} />
      <BalanceDrilldownSheet
        open={balanceSheetOpen}
        onOpenChange={setBalanceSheetOpen}
        breakdown={balance}
      />
    </>
  );
}
