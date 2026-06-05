import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProcessSelectorButton } from './ProcessSelectorButton';
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

export function TimeTrackerBar({ onSubmit, initialData, disabled }: TimeTrackerBarProps) {
  const today = new Date().toISOString().split('T')[0];

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

  const durationSeconds = useMemo(
    () => computeDurationSeconds(startTime, endTime),
    [startTime, endTime]
  );

  const durationDisplay = useMemo(() => formatDuration(durationSeconds), [durationSeconds]);

  const isValid = !!task && !!date && !!startTime && !!endTime && durationSeconds > 0;

  const handleSubmit = useCallback(async () => {
    if (!isValid || !task || durationSeconds <= 0) return;

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
  }, [isValid, task, durationSeconds, date, startTime, endTime, description, onSubmit]);

  return (
    <div className="flex items-center gap-2 w-full">
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="¿En qué estás trabajando?"
        disabled={disabled || isSubmitting}
        className="flex-1 min-w-0"
      />

      <ProcessSelectorButton
        value={task}
        onChange={setTask}
        disabled={disabled || isSubmitting}
        className="w-48"
      />

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
        disabled={!isValid || isSubmitting || disabled}
      >
        {isSubmitting ? 'Guardando...' : 'AÑADIR'}
      </Button>
    </div>
  );
}
