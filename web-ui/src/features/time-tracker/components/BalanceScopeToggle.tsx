import type { BalanceScope } from '../hooks/useBalanceBreakdown';

export interface BalanceScopeToggleProps {
  scope: BalanceScope;
  onChange: (scope: BalanceScope) => void;
}

/**
 * Conmutador Período / Histórico de la card Balance.
 * Corta la propagación: la card entera abre el desglose y este toggle no debe.
 */
export function BalanceScopeToggle({ scope: balanceScope, onChange: setBalanceScope }: BalanceScopeToggleProps) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-md border p-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      {(['period', 'global'] as const).map((scope) => (
        <button
          key={scope}
          type="button"
          aria-pressed={balanceScope === scope}
          data-testid={`balance-scope-${scope}`}
          onClick={(e) => {
            e.stopPropagation();
            setBalanceScope(scope);
          }}
          className={`px-1.5 py-0.5 text-[10px] font-medium rounded-sm transition-colors ${
            balanceScope === scope
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {scope === 'period' ? 'Período' : 'Histórico'}
        </button>
      ))}
    </div>
  );
}
