import { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, List, Pencil } from 'lucide-react';
import { ProcessSelectorButton } from './ProcessSelectorButton';
import { MidnightSplitModal } from './MidnightSplitModal';
import { detectCrossing } from '../lib/timerCrossingDetector';
import type { SplitProposal } from '../lib/timerCrossingDetector';
import type { StopTimerResult } from '../services/timeTrackingService';
import type { TimeEntry, Proceso, TimerState } from '../types';

interface TimeTrackerBarProps {
  onSubmit: (data: {
    taskId: number;
    taskName: string;
    date: string;
    startTime: string;
    endTime: string;
    description?: string;
  }) => Promise<void>;
  initialData?: Partial<TimeEntry>;
  disabled?: boolean;
  defaultMode?: 'timer' | 'manual';
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

function computeDurationSeconds(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return ((eh * 60 + em) - (sh * 60 + sm)) * 60;
}

export function TimeTrackerBar({ onSubmit, initialData, disabled, defaultMode = 'timer', timer }: TimeTrackerBarProps) {
  const today = new Date().toISOString().split('T')[0];

  const [mode, setMode] = useState<'timer' | 'manual'>(defaultMode);
  const [task, setTask] = useState<Proceso | null>(
    initialData?.taskId != null
      ? { proceso: initialData.taskId, nombre: initialData.taskName || '' }
      : null
  );
  const [description, setDescription] = useState(initialData?.description || '');
  const [date, setDate] = useState(initialData?.date || today);
  const [startTime, setStartTime] = useState(initialData?.startTime || '09:00');
  const [endTime, setEndTime] = useState(initialData?.endTime || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Start time editing state
  const [editingStartTime, setEditingStartTime] = useState(false);

  // Midnight split modal state
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitProposal, setSplitProposal] = useState<SplitProposal[]>([]);
  const [pendingStop, setPendingStop] = useState<StopTimerResult | null>(null);

  // Restore task from running timer on mount
  useEffect(() => {
    if (timer.timerState?.isRunning && !task) {
      setTask({ proceso: timer.timerState.taskId, nombre: timer.timerState.taskName });
      setMode('timer');
    }
    if (timer.timerState?.isRunning && timer.timerState.description && !description) {
      setDescription(timer.timerState.description);
    }
  }, [timer.timerState]);

  // Sync form state when initialData changes (edit mode)
  useEffect(() => {
    if (initialData) {
      setTask(
        initialData.taskId != null
          ? { proceso: initialData.taskId, nombre: initialData.taskName || '' }
          : null
      );
      setDescription(initialData.description || '');
      setDate(initialData.date || today);
      setStartTime(initialData.startTime || '09:00');
      setEndTime(initialData.endTime || '');
      setMode('manual');
    }
  }, [initialData]);

  const durationSeconds = useMemo(
    () => computeDurationSeconds(startTime, endTime),
    [startTime, endTime]
  );

  const durationDisplay = useMemo(() => formatDuration(durationSeconds), [durationSeconds]);

  // Manual mode validation
  const isManualValid = !!task && !!date && !!startTime && !!endTime && durationSeconds > 0;

  const handleSubmit = useCallback(async () => {
    if (!isManualValid || !task || durationSeconds <= 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        taskId: task.proceso,
        taskName: task.nombre,
        date,
        startTime,
        endTime,
        description: description || undefined,
      });
      setStartTime('09:00');
      setEndTime('');
      setDescription('');
    } finally {
      setIsSubmitting(false);
    }
  }, [isManualValid, task, durationSeconds, date, startTime, endTime, description, onSubmit]);

  // Timer handlers
  const handleStart = useCallback(async () => {
    if (!task) return;
    await timer.start(task.proceso, task.nombre, description || undefined);
  }, [task, timer, description]);

  const handleStop = useCallback(async () => {
    const result = await timer.stop({ persist: false });
    if (!result || !('start' in result)) return;

    const crossing = detectCrossing(result.start, result.end);
    if (crossing.crossed && crossing.splits) {
      setSplitProposal(crossing.splits);
      setPendingStop(result);
      setSplitModalOpen(true);
    } else {
      await onSubmit({
        taskId: result.taskId,
        taskName: result.taskName,
        date: result.end.toLocaleDateString('sv-SE'),
        startTime: result.start.toTimeString().slice(0, 5),
        endTime: result.end.toTimeString().slice(0, 5),
        description: description || undefined,
      });
    }
  }, [timer, onSubmit, description]);

  const handleCancel = useCallback(async () => {
    await timer.cancel();
  }, [timer]);

  const handleSplitConfirm = useCallback(async () => {
    if (!pendingStop) return;
    for (const split of splitProposal) {
      await onSubmit({
        taskId: pendingStop.taskId,
        taskName: pendingStop.taskName,
        date: split.date,
        startTime: split.startTime,
        endTime: split.endTime,
        description: description || undefined,
      });
    }
    setSplitModalOpen(false);
    setPendingStop(null);
    setSplitProposal([]);
  }, [pendingStop, splitProposal, onSubmit, description]);

  const handleKeepSingle = useCallback(async () => {
    if (!pendingStop) return;
    await onSubmit({
      taskId: pendingStop.taskId,
      taskName: pendingStop.taskName,
      date: pendingStop.end.toLocaleDateString('sv-SE'),
      startTime: pendingStop.start.toTimeString().slice(0, 5),
      endTime: pendingStop.end.toTimeString().slice(0, 5),
      description: description || undefined,
    });
    setSplitModalOpen(false);
    setPendingStop(null);
    setSplitProposal([]);
  }, [pendingStop, onSubmit, description]);

  // Force timer mode when timer is running
  useEffect(() => {
    if (timer.isRunning) {
      setMode('timer');
    }
  }, [timer.isRunning]);

  // Reset editing state when timer stops
  useEffect(() => {
    if (!timer.isRunning) {
      setEditingStartTime(false);
    }
  }, [timer.isRunning]);

  // Persist description to IndexedDB when it changes while timer is running
  useEffect(() => {
    if (timer.isRunning && description) {
      timer.updateDescription(description);
    }
  }, [description, timer.isRunning]);

  return (
    <>
      <div className="flex items-center gap-2 w-full flex-wrap">
        {/* Description — shared across modes */}
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="¿En qué estás trabajando?"
          disabled={disabled || isSubmitting}
          className="flex-1 min-w-0"
        />

        {/* Process selector — shared across modes */}
        <ProcessSelectorButton
          value={task}
          onChange={setTask}
          disabled={disabled || isSubmitting || timer.isRunning}
          className="w-96"
        />

        {mode === 'timer' ? (
          <>
            {/* Clock display */}
            <span className="font-mono text-sm tabular-nums whitespace-nowrap w-20 text-center">
              {formatDuration(timer.elapsed)}
            </span>

            {/* Start time display / edit */}
            {timer.isRunning && (
              (() => {
                // Convertir startTime UTC a componentes locales para mostrar/editar
                const getLocalTimeHHMM = (isoString: string): string => {
                  const d = new Date(isoString);
                  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                };

                const handleSave = (val: string) => {
                  if (!val || !timer.timerState?.startTime) return;
                  const [hours, minutes] = val.split(':').map(Number);
                  const d = new Date(timer.timerState.startTime);
                  d.setHours(hours, minutes, 0, 0);
                  timer.updateStartTime(d.toISOString());
                };

                return editingStartTime ? (
                  <Input
                    type="time"
                    defaultValue={
                      timer.timerState?.startTime
                        ? getLocalTimeHHMM(timer.timerState.startTime)
                        : ''
                    }
                    className="w-24 font-mono text-xs"
                    autoFocus
                    onBlur={(e) => {
                      handleSave(e.target.value);
                      setEditingStartTime(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSave((e.target as HTMLInputElement).value);
                        setEditingStartTime(false);
                      } else if (e.key === 'Escape') {
                        setEditingStartTime(false);
                      }
                    }}
                  />
                ) : (
                  <span
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors whitespace-nowrap rounded px-1.5 py-0.5 hover:bg-accent/50"
                    role="button"
                    tabIndex={0}
                    aria-label={`Hora de inicio: ${timer.timerState?.startTime ? getLocalTimeHHMM(timer.timerState.startTime) : '--:--'}. Click para editar.`}
                    onClick={() => setEditingStartTime(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setEditingStartTime(true);
                      }
                    }}
                  >
                    <span className="text-muted-foreground/70">Inicio:</span>
                    <span className="font-mono font-medium text-foreground">
                      {timer.timerState?.startTime
                        ? getLocalTimeHHMM(timer.timerState.startTime)
                        : '--:--'}
                    </span>
                    <Pencil className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                  </span>
                );
              })()
            )}

            {/* INICIO / DETENER */}
            {timer.isRunning ? (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="destructive"
                  onClick={handleStop}
                  disabled={disabled}
                >
                  Detener
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={handleCancel}
                  disabled={disabled}
                  title="Cancelar"
                >
                  ✕
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleStart}
                disabled={disabled || !task}
                title={!task ? 'Seleccioná una tarea primero' : undefined}
              >
                Iniciar
              </Button>
            )}
          </>
        ) : (
          <>
            {/* Manual mode fields */}
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={disabled || isSubmitting}
              className="w-36"
            />

            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={disabled || isSubmitting}
              className="w-28"
            />

            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={disabled || isSubmitting}
              className="w-28"
            />

            <span className="font-mono text-sm tabular-nums whitespace-nowrap w-20 text-center">
              {durationDisplay}
            </span>

            <Button
              onClick={handleSubmit}
              disabled={!isManualValid || isSubmitting || disabled}
            >
              {isSubmitting ? 'Guardando...' : 'Añadir'}
            </Button>
          </>
        )}

        {/* Stacked mode icons — hidden while timer is running to prevent mode switching */}
        {!timer.isRunning && (
          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setMode('timer')}
              disabled={disabled}
              aria-label="Modo temporizador"
              aria-pressed={mode === 'timer'}
              title="Timer"
              className={`p-1 rounded transition-colors min-w-[44px] min-h-[44px] ${
                mode === 'timer'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              disabled={disabled}
              aria-label="Modo manual"
              aria-pressed={mode === 'manual'}
              title="Manual"
              className={`p-1 rounded transition-colors min-w-[44px] min-h-[44px] ${
                mode === 'manual'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Midnight split modal */}
      <MidnightSplitModal
        open={splitModalOpen}
        onOpenChange={setSplitModalOpen}
        proposal={splitProposal}
        onSplit={handleSplitConfirm}
        onKeepSingle={handleKeepSingle}
      />
    </>
  );
}
