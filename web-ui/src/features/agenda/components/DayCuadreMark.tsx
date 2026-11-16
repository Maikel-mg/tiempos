import { AlertTriangle, Check, EyeOff, MinusCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DAY_CUADRE_LABEL, hasMark, type DayCuadre } from '../lib/cuadre';

/** Tono e icono de cada estado del cuadre; los días sin marca no pintan nada. */
const MARK_TONE: Record<DayCuadre['status'], { className: string; Icon: LucideIcon } | null> = {
  cuadra: { className: 'text-emerald-600 dark:text-emerald-400', Icon: Check },
  descuadrado: { className: 'text-amber-600 dark:text-amber-400', Icon: AlertTriangle },
  'sin-marcajes-validos': { className: 'text-muted-foreground/70', Icon: MinusCircle },
  ignorado: { className: 'text-muted-foreground/70', Icon: EyeOff },
  hoy: null,
  'sin-marcajes': null,
};

/**
 * Marca de cuadre de un día: el mismo indicador en Calendario, Agenda y
 * Timeline. Sin marca el día se pinta exactamente como siempre.
 *
 * `compact` deja solo el icono, para las cabeceras estrechas del Calendario y
 * del Timeline; el texto completo sigue estando en el título y en el nombre
 * accesible.
 */
export function DayCuadreMark({ cuadre, compact = false }: { cuadre?: DayCuadre; compact?: boolean }) {
  if (!cuadre || !hasMark(cuadre)) return null;
  const tone = MARK_TONE[cuadre.status];
  if (!tone) return null;

  const label = DAY_CUADRE_LABEL[cuadre.status];
  const { Icon, className } = tone;

  return (
    <span
      title={label}
      aria-label={label}
      role="img"
      className={`inline-flex shrink-0 items-center gap-1 text-[10px] font-medium ${className}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {!compact && <span className="truncate">{label}</span>}
    </span>
  );
}
