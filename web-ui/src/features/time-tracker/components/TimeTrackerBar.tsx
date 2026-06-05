import { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProcessSelectorButton } from './ProcessSelectorButton';
import { MidnightSplitModal } from './MidnightSplitModal';
import { useTimer } from '../hooks/useTimer';
import { detectCrossing } from '../lib/timerCrossingDetector';
import type { SplitProposal } from '../lib/timerCrossingDetector';
import type { StopTimerResult } from '../services/timeTrackingService';
import type { TimeEntry, Proceso } from '../types';

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

export function TimeTrackerBar({ onSubmit, initialData, disabled, defaultMode = 'timer' }: TimeTrackerBarProps) {
  const today = new Date().toISOString().split('T')[0];
  const timer = useTimer();

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
  }, [timer.timerState]);

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
    await timer.start(task.proceso, task.nombre);
  }, [task, timer]);

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

  return (
    <>
      <div className="flex items-center gap-2 w-full">
        {/* Mode toggle */}
        <div className="flex rounded-md border border-input bg-muted p-0.5 text-muted-foreground shrink-0">
          <button
            type="button"
            onClick={() => setMode('timer')}
            disabled={disabled || timer.isRunning}
            className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors ${
              mode === 'timer'
                ? 'bg-background text-foreground shadow-sm'
                : 'hover:text-foreground'
            }`}
          >
            Timer
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            disabled={disabled || timer.isRunning}
            className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors ${
              mode === 'manual'
                ? 'bg-background text-foreground shadow-sm'
                : 'hover:text-foreground'
            }`}
          >
            Manual
          </button>
        </div>

        {/* Description — shared across modes */}
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="¿En qué estás trabajando?"
          disabled={disabled || isSubmitting || timer.isRunning}
          className="flex-1 min-w-0"
        />

        {/* Process selector — shared across modes */}
        <ProcessSelectorButton
          value={task}
          onChange={setTask}
          disabled={disabled || isSubmitting || timer.isRunning}
          className="w-48"
        />

        {mode === 'timer' ? (
          <>
            {/* Clock display */}
            <span className="font-mono text-sm tabular-nums whitespace-nowrap w-20 text-center">
              {formatDuration(timer.elapsed)}
            </span>

            {/* INICIO / DETENER */}
            {timer.isRunning ? (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="destructive"
                  onClick={handleStop}
                  disabled={disabled}
                >
                  DETENER
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
                INICIO
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
              {isSubmitting ? 'Guardando...' : 'AÑADIR'}
            </Button>
          </>
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
