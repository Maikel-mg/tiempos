import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProcessSelectorButton } from './ProcessSelectorButton';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import type { TimeEntry, Proceso } from '../types';

export interface TimeEntryFormData {
  taskId: number;
  taskName: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
  recoverable: boolean;
}

interface TimeEntryEditorDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  entry?: TimeEntry | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TimeEntryFormData) => Promise<void>;
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

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function formDataFromEntry(entry?: TimeEntry | null): TimeEntryFormData {
  return {
    taskId: entry?.taskId ?? 0,
    taskName: entry?.taskName ?? '',
    date: entry?.date ?? todayString(),
    startTime: entry?.startTime ?? '09:00',
    endTime: entry?.endTime ?? '',
    description: entry?.description ?? '',
    recoverable: entry?.recoverable ?? false,
  };
}

function hasFormChanged(current: TimeEntryFormData, initial: TimeEntryFormData): boolean {
  return JSON.stringify(current) !== JSON.stringify(initial);
}

export function TimeEntryEditorDialog({
  open,
  mode,
  entry,
  onOpenChange,
  onSubmit,
}: TimeEntryEditorDialogProps) {
  const descriptionRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<TimeEntryFormData>(() => formDataFromEntry(entry));
  const [initialForm, setInitialForm] = useState<TimeEntryFormData>(() => formDataFromEntry(entry));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const nextForm = formDataFromEntry(entry);
    setForm(nextForm);
    setInitialForm(nextForm);
    requestAnimationFrame(() => descriptionRef.current?.focus());
  }, [open, entry]);

  const durationSeconds = useMemo(
    () => computeDurationSeconds(form.startTime, form.endTime),
    [form.startTime, form.endTime]
  );
  const isValid = form.taskId > 0 && !!form.date && !!form.startTime && !!form.endTime && durationSeconds > 0;
  const isDirty = hasFormChanged(form, initialForm);
  const title = mode === 'edit' ? 'Editar registro de tiempo' : 'Nuevo registro de tiempo';
  const description = mode === 'edit'
    ? `Modificando ${entry?.taskName ?? 'registro seleccionado'}.`
    : 'Crea un registro manual sin detener el timer activo.';

  const requestClose = useCallback(() => {
    if (isDirty && !window.confirm('Hay cambios sin guardar. ¿Quieres descartarlos?')) return;
    onOpenChange(false);
  }, [isDirty, onOpenChange]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    requestClose();
  }, [onOpenChange, requestClose]);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...form,
        description: form.description || undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [form, isSubmitting, isValid, onOpenChange, onSubmit]);

  const updateForm = useCallback(<K extends keyof TimeEntryFormData>(key: K, value: TimeEntryFormData[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const task: Proceso | null = form.taskId > 0
    ? { proceso: form.taskId, nombre: form.taskName }
    : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="time-entry-description" className="text-sm font-medium">Descripción</label>
            <Input
              id="time-entry-description"
              ref={descriptionRef}
              value={form.description}
              onChange={(event) => updateForm('description', event.target.value)}
              placeholder="¿En qué estás trabajando?"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tarea (Proceso)</label>
            <ProcessSelectorButton
              value={task}
              onChange={(nextTask) => {
                setForm((current) => ({
                  ...current,
                  taskId: nextTask?.proceso ?? 0,
                  taskName: nextTask?.nombre ?? '',
                }));
              }}
              disabled={isSubmitting}
              className="w-full"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="time-entry-date" className="text-sm font-medium">Fecha</label>
              <Input
                id="time-entry-date"
                type="date"
                value={form.date}
                onChange={(event) => updateForm('date', event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="time-entry-start" className="text-sm font-medium">Inicio</label>
              <Input
                id="time-entry-start"
                type="time"
                value={form.startTime}
                onChange={(event) => updateForm('startTime', event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="time-entry-end" className="text-sm font-medium">Fin</label>
              <Input
                id="time-entry-end"
                type="time"
                value={form.endTime}
                onChange={(event) => updateForm('endTime', event.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-sm tabular-nums">Duración: {formatDuration(durationSeconds)}</span>
            <button
              type="button"
              onClick={() => updateForm('recoverable', !form.recoverable)}
              disabled={isSubmitting}
              aria-label="Permiso (recuperable)"
              aria-pressed={form.recoverable}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium transition-all ${
                form.recoverable
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              {form.recoverable ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
              Permiso
            </button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={requestClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Crear registro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
