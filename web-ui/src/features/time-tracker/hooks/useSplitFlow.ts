import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';
import type { SplitCut } from './useSplitCut';
import type { SplitDescriptions } from '../lib/splitEntry';
import type { SplitEntryOutcome } from '../services/timeTrackingService';
import type { TimeEntry, TimerState } from '../types';

/** Resultado de dividir el Timer activo: la mitad persistida y el nuevo anclaje. */
export type SplitRunningTimerOutcome =
  | { ok: true; first: TimeEntry; timerStartTime: string }
  | { ok: false; reason: string };

/** Lo que el flujo de split necesita del Timer activo para re-anclarlo y describirlo. */
export interface SplitTimerPort {
  timerState: TimerState | null;
  updateStartTime: (newStartTime: string) => Promise<void>;
  updateDescription: (description: string) => Promise<void>;
}

export interface UseSplitFlowParams {
  /** Divide un Registro guardado y persiste las dos mitades. */
  splitEntry: (
    id: string,
    cutTime: string,
    descriptions: SplitDescriptions,
  ) => Promise<SplitEntryOutcome>;
  /** Divide el Timer activo: persiste la primera mitad y devuelve el nuevo anclaje. */
  splitRunningTimer: (
    timerEntry: TimeEntry,
    cutTime: string,
    firstDescription?: string,
  ) => Promise<SplitRunningTimerOutcome>;
  /** Borra una mitad al deshacer. */
  deleteEntry: (id: string) => Promise<void>;
  /** Restaura el Registro original al deshacer una división guardada. */
  updateEntry: (id: string, data: Partial<TimeEntry>) => Promise<TimeEntry | null>;
  /** Timer activo: de aquí salen su descripción y su anclaje. */
  timer: SplitTimerPort;
  /** Entrada real del timer en curso, o `null` si no corre. */
  liveTimerEntry: TimeEntry | null;
  /** Selección de filas de la página; las mitades nuevas entran y salen de ella. */
  selectedIds: Set<string>;
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>;
}

/** Estado guardado para deshacer la última división. */
interface SplitUndo {
  /** Registro persistido a recortar; `null` si la mitad vive solo en el timer. */
  firstId: string | null;
  /** Mitad nueva persistida; `null` cuando no se persiste (timer en curso). */
  secondId: string | null;
  /**
   * `true` cuando lo que se dividió fue el timer en curso. En ese caso la primera
   * mitad se persistió con un id nuevo y la segunda sigue corriendo: deshacer
   * borra la primera y re-ancla el timer.
   */
  fromTimer: boolean;
  original: TimeEntry;
  timerStartTime?: string;
  /** Se marca cuando alguna de las dos mitades ya se sincronizó: invalida el deshacer. */
  invalidated: boolean;
}

/**
 * Flujo de "Dividir": dividir un Registro guardado y dividir el Timer activo, el
 * deshacer de la división, la descripción que queda pendiente en el timer y el
 * confirm.
 *
 * Sólo orquesta: la geometría y la construcción de las mitades viven en la lógica
 * pura (`lib/splitEntry`), y el diálogo (`SplitEntryDialog`/`useSplitCut`) no se
 * toca. La selección de filas y el timer entran como dependencias; el
 * comportamiento es el mismo que tenía la página.
 */
export function useSplitFlow({
  splitEntry,
  splitRunningTimer,
  deleteEntry,
  updateEntry,
  timer,
  liveTimerEntry,
  selectedIds,
  setSelectedIds,
}: UseSplitFlowParams) {
  /** Registro que se está dividiendo. */
  const [splittingEntry, setSplittingEntry] = useState<TimeEntry | null>(null);
  /** `true` cuando lo que se divide es el timer en curso y no un Registro guardado. */
  const [splittingTimer, setSplittingTimer] = useState(false);

  const splitUndo = useRef<SplitUndo | null>(null);

  /** Abre el diálogo para dividir un Registro guardado. */
  const handleSplitEntry = useCallback((entry: TimeEntry) => {
    setSplittingTimer(false);
    setSplittingEntry(entry);
  }, []);

  /** Abre el diálogo para dividir el Timer activo. */
  const handleSplitTimer = useCallback(() => {
    setSplittingTimer(true);
    setSplittingEntry(liveTimerEntry);
  }, [liveTimerEntry]);

  /** Cierra el diálogo y descarta lo que se estaba dividiendo. */
  const handleSplitDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSplittingEntry(null);
      setSplittingTimer(false);
    }
  }, []);

  /** Sincronizar una mitad invalida el deshacer de su división: revertirla
   * dejaría en la base un Registro que ya no existe. */
  const handleEntriesSynced = useCallback((succeededIds: string[]) => {
    const undo = splitUndo.current;
    if (undo && succeededIds.some((id) => id === undo.firstId || id === undo.secondId)) {
      undo.invalidated = true;
    }
  }, []);

  /**
   * Deshace la última división. En un Registro guardado restaura la original
   * entera (horario, duración y descripción); en el timer en curso borra la
   * primera mitad y re-ancla el timer.
   */
  const handleUndoSplit = useCallback(async () => {
    const undo = splitUndo.current;
    if (!undo) return;

    if (undo.invalidated) {
      splitUndo.current = null;
      toast.error('No se puede deshacer: una de las mitades ya se sincronizó');
      return;
    }

    // Los ids se guardan tal como los asignó la capa que persistió: el diálogo
    // construye mitades con ids propios que nunca llegan a la base.
    if (undo.secondId) await deleteEntry(undo.secondId);

    // En el timer en curso la primera mitad se persistió como Registro nuevo, así
    // que se borra y el timer recupera su descripción previa; en un Registro
    // guardado se restaura la original entera (horario, duración y descripción).
    if (undo.fromTimer) {
      if (undo.firstId) await deleteEntry(undo.firstId);
      if ((timer.timerState?.description ?? '') !== (undo.original.description ?? '')) {
        await timer.updateDescription(undo.original.description ?? '');
      }
    } else if (undo.firstId) {
      await updateEntry(undo.firstId, {
        endTime: undo.original.endTime,
        duration: undo.original.duration,
        description: undo.original.description,
      });
    }

    if (undo.timerStartTime) {
      await timer.updateStartTime(undo.timerStartTime);
    }

    if (undo.secondId) {
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(undo.secondId!);
        return next;
      });
    }

    splitUndo.current = null;
    toast.success('División deshecha');
  }, [deleteEntry, updateEntry, timer, setSelectedIds]);

  /**
   * Persiste el resultado de dividir. En un Registro guardado las dos mitades van
   * a la base local; en el timer en curso solo se guarda la primera y el timer se
   * re-ancla al punto de corte, de modo que la segunda mitad sigue corriendo.
   */
  const handleSplitConfirm = useCallback(
    async ({ entryId, cutTime, firstDescription, secondDescription }: SplitCut) => {
      const restoringTimerStart = splittingTimer ? timer.timerState?.startTime : undefined;

      let undo: SplitUndo;

      if (splittingTimer) {
        // Sólo se persiste la primera mitad; la segunda sigue corriendo en el timer.
        const target = liveTimerEntry;
        if (!target) return;
        const outcome = await splitRunningTimer(target, cutTime, firstDescription);
        if (!outcome.ok) {
          toast.error(outcome.reason);
          return;
        }
        await timer.updateStartTime(outcome.timerStartTime);
        // La segunda mitad ES el timer: su descripción se edita sobre él.
        if (secondDescription !== (target.description ?? '')) {
          await timer.updateDescription(secondDescription);
        }
        undo = {
          firstId: outcome.first.id,
          secondId: null,
          fromTimer: true,
          original: target,
          timerStartTime: restoringTimerStart,
          invalidated: false,
        };
      } else {
        // El diálogo sólo se abre con un Registro en la mano: sin él no habría
        // forma de deshacer, así que no se divide.
        if (!splittingEntry) return;
        const outcome = await splitEntry(entryId, cutTime, {
          first: firstDescription,
          second: secondDescription,
        });
        if (!outcome.ok) {
          toast.error(outcome.reason);
          return;
        }
        // El id de la mitad nueva lo asigna la capa que persiste, no el diálogo.
        undo = {
          firstId: outcome.first.id,
          secondId: outcome.second.id,
          fromTimer: false,
          // El estado previo a dividir: sin él "deshacer" no puede revertir el
          // recorte ni las descripciones.
          original: splittingEntry,
          timerStartTime: restoringTimerStart,
          invalidated: false,
        };

        if (selectedIds.has(entryId)) {
          setSelectedIds((current) => new Set([...current, outcome.second.id]));
        }
      }

      // Se registra antes de mostrar el aviso: el `onClick` del toast captura el
      // buffer actual, no el que existirá en un render posterior.
      splitUndo.current = undo;

      toast('Entrada dividida', {
        action: {
          label: 'Deshacer',
          onClick: () => {
            void handleUndoSplit();
          },
        },
        onAutoClose: () => {
          splitUndo.current = null;
        },
      });
    },
    [
      splittingTimer,
      splittingEntry,
      liveTimerEntry,
      timer,
      splitRunningTimer,
      splitEntry,
      selectedIds,
      setSelectedIds,
      handleUndoSplit,
    ],
  );

  return {
    splittingEntry,
    splittingTimer,
    handleSplitEntry,
    handleSplitTimer,
    handleSplitDialogOpenChange,
    handleUndoSplit,
    handleSplitConfirm,
    handleEntriesSynced,
  };
}
