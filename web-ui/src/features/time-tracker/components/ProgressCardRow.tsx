import type { ComponentType, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

export interface CardData {
  icon: ComponentType<{ className?: string }>;
  label: string;
  segmentTestId: string;
  barTestId: string;
  workedStr: string;
  subtext: string;
  accentClass: string;
  percent: number;
  onClick?: () => void;
  headerAction?: ReactNode;
}

function ProgressCard({ card, onClick }: { card: CardData; onClick?: () => void }) {
  const color = card.accentClass || 'text-amber-600 dark:text-amber-400';
  const barColor = card.accentClass ? 'bg-emerald-500' : 'bg-amber-500';
  const barBg = card.accentClass ? 'bg-emerald-500/15' : 'bg-amber-500/15';
  const Icon = card.icon;

  return (
    <Card
      className={`flex-1${onClick ? ' cursor-pointer hover:bg-accent/50 transition-colors' : ''}`}
      onClick={onClick}
      data-testid={card.segmentTestId}
    >
      <CardContent className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">
              {card.label}
            </span>
          </div>
          {card.headerAction}
        </div>

        <span
          className={`text-2xl font-bold tabular-nums tracking-tight leading-none ${color}`}
          data-testid={`${card.segmentTestId}-value`}
        >
          {card.workedStr}
        </span>

        <p className={`text-sm ${card.accentClass || 'text-muted-foreground'}`}>
          {card.subtext}
        </p>

        <div className={`h-1.5 w-full rounded-full overflow-hidden ${barBg}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
            style={{ width: `${Math.min(100, card.percent)}%` }}
            data-testid={card.barTestId}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/** Fila de cards de progreso: Hoy, Semana, Mes y Balance. */
export function ProgressCardRow({ cards }: { cards: CardData[] }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3" data-testid="period-progress-panel">
      {cards.map((card) => (
        <ProgressCard key={card.label} card={card} onClick={card.onClick} />
      ))}
    </div>
  );
}
