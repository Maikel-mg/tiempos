import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, ShieldCheck, ShieldOff } from 'lucide-react';
import { ProcessSelectorButton } from './ProcessSelectorButton';
import { MidnightSplitModal } from './MidnightSplitModal';
import { detectCrossing } from '../lib/timerCrossingDetector';
import type { SplitProposal } from '../lib/timerCrossingDetector';
import type { StopTimerResult } from '../services/timeTrackingService';
import type { TimeEntry } from '../types';
import type { Proceso, TimerState } from '../types';
import type { TimeEntryFormData } from './TimeEntryEditorDialog';

export interface TimeTrackerBarHandle {
  isEditingStartTime: boolean;
}

interface TimeTrackerBarProps {
  onSubmit: (data: TimeEntryFormData) => Promise<void>;
  disabled?: boolean;
  timer: {
    isRunning: boolean;
    elapsed: number;
    timerState: TimerState | null;
    start: (taskId: number, taskName: string, description?: string) => Promise<void>;
    stop: (options?: { persist?: boolean }) => Promise<TimeEntry | StopTimerResult | null>;
    updateStartTime: (newStartTime: string) => Promise<void>;
    updateDescription: (description: string) => Promise<void>;
    cancel: () => Promise<void>;
  };
}

function formatDuration(seconds: number): string {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export const TimeTrackerBar = forwardRef<TimeTrackerBarHandle, TimeTrackerBarProps>(function TimeTrackerBar(
  { onSubmit, disabled, timer },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [task, setTask] = useState<Proceso | null>(null);
  const [description, setDescription] = useState('');
  const [recoverable, setRecoverable] = useState(false);
  const [editingStartTime, setEditingStartTime] = useState(false);
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitProposal, setSplitProposal] = useState<SplitProposal[]>([]);
  const [pendingStop, setPendingStop] = useState<StopTimerResult | null>(null);

  useImperativeHandle(ref, () => ({
    get isEditingStartTime() {
      return editingStartTime;
    },
  }), [editingStartTime]);

  useEffect(() => {
    if (timer.timerState?.isRunning) {
      setTask({ proceso: timer.timerState.taskId, nombre: timer.timerState.taskName });
      if (timer.timerState.description !== undefined) {
        setDescription(timer.timerState.description);
      }
    }
  }, [timer.timerState]);

  useEffect(() => {
    if (!timer.isRunning) setEditingStartTime(false);
  }, [timer.isRunning]);

  useEffect(() => {
    if (timer.isRunning && description) {
      timer.updateDescription(description);
    }
  }, [description, timer.isRunning]);

  const handleStart = useCallback(async () => {
    if (!task) return;
    await timer.start(task.proceso, task.nombre, description || undefined);
  }, [description, task, timer]);

  const createTimerEntry = useCallback(async (result: StopTimerResult, date: string, startTime: string, endTime: string) => {
    await onSubmit({
      taskId: result.taskId,
      taskName: result.taskName,
      date,
      startTime,
      endTime,
      description: description || undefined,
      recoverable,
    });
  }, [description, onSubmit, recoverable]);

  const handleStop = useCallback(async () => {
    const result = await timer.stop({ persist: false });
    if (!result || !('start' in result)) return;

    const stopResult = result as StopTimerResult;
    const crossing = detectCrossing(stopResult.start, stopResult.end);
    if (crossing.crossed && crossing.splits) {
      setSplitProposal(crossing.splits);
      setPendingStop(stopResult);
      setSplitModalOpen(true);
      return;
    }

    await createTimerEntry(
      stopResult,
      stopResult.end.toLocaleDateString('sv-SE'),
      stopResult.start.toTimeString().slice(0, 5),
      stopResult.end.toTimeString().slice(0, 5),
    );
  }, [createTimerEntry, timer]);

  const handleSplitConfirm = useCallback(async () => {
    if (!pendingStop) return;
    for (const split of splitProposal) {
      await createTimerEntry(pendingStop, split.date, split.startTime, split.endTime);
    }
    setSplitModalOpen(false);
    setPendingStop(null);
    setSplitProposal([]);
  }, [createTimerEntry, pendingStop, splitProposal]);

  const handleKeepSingle = useCallback(async () => {
    if (!pendingStop) return;
    await createTimerEntry(
      pendingStop,
      pendingStop.end.toLocaleDateString('sv-SE'),
      pendingStop.start.toTimeString().slice(0, 5),
      pendingStop.end.toTimeString().slice(0, 5),
    );
    setSplitModalOpen(false);
    setPendingStop(null);
    setSplitProposal([]);
  }, [createTimerEntry, pendingStop]);

  return (
    <>
      <div className="flex items-center gap-2.5 w-full flex-wrap rounded-lg border border-border bg-card p-3">
        <Input
          ref={inputRef}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="¿En qué estás trabajando?"
          disabled={disabled}
          className="min-w-0 flex-1 border-border bg-background"
        />

        <ProcessSelectorButton
          value={task}
          onChange={setTask}
          disabled={disabled || timer.isRunning}
          className="w-96"
        />

        <button
          type="button"
          onClick={() => setRecoverable((current) => !current)}
          disabled={disabled}
          aria-label="Permiso (recuperable)"
          aria-pressed={recoverable}
          title="Marcar como permiso"
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium transition-all ${
            recoverable
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
          }`}
        >
          {recoverable ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
        </button>

        <span className="w-20 whitespace-nowrap text-center font-mono text-sm tabular-nums text-foreground">
          {formatDuration(timer.elapsed)}
        </span>

        {timer.isRunning && (() => {
          const getLocalTimeHHMM = (isoString: string): string => {
            const date = new Date(isoString);
            return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
          };

          const handleSave = (value: string) => {
            if (!value || !timer.timerState?.startTime) return;
            const [hours, minutes] = value.split(':').map(Number);
            const date = new Date(timer.timerState.startTime);
            date.setHours(hours, minutes, 0, 0);
            timer.updateStartTime(date.toISOString());
          };

          return editingStartTime ? (
            <Input
              type="time"
              defaultValue={timer.timerState?.startTime ? getLocalTimeHHMM(timer.timerState.startTime) : ''}
              className="w-24 font-mono text-xs tabular-nums"
              autoFocus
              onBlur={(event) => {
                handleSave(event.target.value);
                setEditingStartTime(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.stopPropagation();
                  handleSave(event.currentTarget.value);
                  setEditingStartTime(false);
                } else if (event.key === 'Escape') {
                  event.stopPropagation();
                  setEditingStartTime(false);
                }
              }}
            />
          ) : (
            <span
              className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              role="button"
              tabIndex={0}
              aria-label={`Hora de inicio: ${timer.timerState?.startTime ? getLocalTimeHHMM(timer.timerState.startTime) : '--:--'}. Click para editar.`}
              onClick={() => setEditingStartTime(true)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setEditingStartTime(true);
                }
              }}
            >
              <span className="text-muted-foreground/70">Inicio:</span>
              <span className="font-mono font-medium tabular-nums text-foreground">
                {timer.timerState?.startTime ? getLocalTimeHHMM(timer.timerState.startTime) : '--:--'}
              </span>
              <Pencil className="h-3 w-3 opacity-40" />
            </span>
          );
        })()}

        {timer.isRunning ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="destructive" onClick={handleStop} disabled={disabled} className="border border-destructive/50">
              Detener
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => timer.cancel()} disabled={disabled} title="Cancelar">
              ✕
            </Button>
          </div>
        ) : (
          <Button onClick={handleStart} disabled={disabled || !task} title={!task ? 'Seleccioná una tarea primero' : undefined}>
            Iniciar
          </Button>
        )}
      </div>

      <MidnightSplitModal
        open={splitModalOpen}
        onOpenChange={setSplitModalOpen}
        proposal={splitProposal}
        onSplit={handleSplitConfirm}
        onKeepSingle={handleKeepSingle}
      />
    </>
  );
});
