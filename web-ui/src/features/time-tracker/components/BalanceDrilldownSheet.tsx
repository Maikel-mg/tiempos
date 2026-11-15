import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Landmark } from 'lucide-react';
import { formatBreakdownDate, formatHM } from '../lib/progressFormat';
import type { UseBalanceBreakdownResult } from '../hooks/useBalanceBreakdown';

export interface BalanceDrilldownSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Estado y derivados del desglose tal y como los devuelve `useBalanceBreakdown`. */
  breakdown: UseBalanceBreakdownResult;
}

/** Desglose del Balance: total visible, rango de fechas, filtro por signo y filas por día. */
export function BalanceDrilldownSheet({
  open,
  onOpenChange,
  breakdown,
}: BalanceDrilldownSheetProps) {
  const {
    scope: balanceScope,
    signFilter: balanceFilter,
    setSignFilter: setBalanceFilter,
    from: balanceFrom,
    to: balanceTo,
    setFrom: setBalanceFrom,
    setTo: setBalanceTo,
    rows: allRows,
    filteredRows: filteredBreakdown,
    visibleTotal: filteredTotal,
  } = breakdown;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md w-full">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Landmark className="w-4 h-4" />
            Desglose del Balance
          </SheetTitle>
          <p
            data-testid="balance-total"
            className={`text-sm font-medium ${filteredTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}
          >
            {filteredTotal >= 0 ? '+' : '-'}{formatHM(Math.abs(filteredTotal))} total
            <span className="text-muted-foreground font-normal">
              {balanceScope === 'period' ? ' · período seleccionado' : ' · histórico'}
            </span>
          </p>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="space-y-1">
            <Label htmlFor="balance-from" className="text-xs text-muted-foreground">
              Desde
            </Label>
            <Input
              id="balance-from"
              type="date"
              value={balanceFrom}
              onChange={(e) => setBalanceFrom(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="balance-to" className="text-xs text-muted-foreground">
              Hasta
            </Label>
            <Input
              id="balance-to"
              type="date"
              value={balanceTo}
              onChange={(e) => setBalanceTo(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 mb-4">
          {(['all', 'positive', 'negative'] as const).map((filter) => (
            <Button
              key={filter}
              variant={balanceFilter === filter ? 'default' : 'outline'}
              size="sm"
              className="text-xs"
              onClick={() => setBalanceFilter(filter)}
            >
              {filter === 'all' ? 'Todos' : filter === 'positive' ? 'Positivos' : 'Negativos'}
            </Button>
          ))}
        </div>

        <ScrollArea className="h-[calc(100vh-320px)]">
          {filteredBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {allRows.length === 0
                ? 'No hay datos de balance disponibles.'
                : 'No hay entradas con este filtro.'}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredBreakdown.map((item) => {
                const deltaColor =
                  item.delta > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : item.delta < 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground';
                const deltaStr =
                  item.delta === 0
                    ? '0:00'
                    : `${item.delta > 0 ? '+' : '-'}${formatHM(Math.abs(item.delta))}`;
                return (
                  <div
                    key={item.date}
                    className="flex items-center justify-between text-sm p-2 rounded bg-muted/30"
                  >
                    <span className="text-muted-foreground">
                      {formatBreakdownDate(item.date)}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums">{formatHM(item.worked)}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatHM(item.target)}
                      </span>
                      <span className={`tabular-nums font-medium ${deltaColor}`}>
                        {deltaStr}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
