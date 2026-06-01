import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskSelector } from './TaskSelector';
import type { TimeEntry, Proceso } from '../types';

interface TimeEntryFormProps {
  onSubmit: (data: {
    taskId: number;
    taskName: string;
    date: string;
    startTime: string;
    endTime: string;
    description?: string;
  }) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<TimeEntry>;
  disabled?: boolean;
}

/**
 * Calcula la duración en minutos entre dos horas.
 */
function calculateDurationMinutes(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

/**
 * Formulario para crear un registro de tiempo manualmente.
 */
export function TimeEntryForm({ onSubmit, onCancel, initialData, disabled }: TimeEntryFormProps) {
  const today = new Date().toISOString().split('T')[0];
  
  const [task, setTask] = useState<Proceso | null>(
    initialData?.taskId != null
      ? { proceso: initialData.taskId, nombre: initialData.taskName || '' }
      : null
  );
  const [date, setDate] = useState(initialData?.date || today);
  const [startTime, setStartTime] = useState(initialData?.startTime || '09:00');
  const [endTime, setEndTime] = useState(initialData?.endTime || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const durationMinutes = startTime && endTime ? calculateDurationMinutes(startTime, endTime) : 0;
  const isValid = task && date && startTime && endTime && durationMinutes > 0;

  const handleSubmit = async () => {
    if (!isValid || !task) return;
    
    if (durationMinutes <= 0) {
      setError('La hora de salida debe ser mayor que la de entrada');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        taskId: task.proceso,
        taskName: task.nombre,
        date,
        startTime,
        endTime,
        description: description || undefined
      });
      
      // Reset form
      setStartTime('09:00');
      setEndTime('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuevo Registro Manual</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Task Selector */}
        <div className="space-y-2">
          <Label>Tarea</Label>
          <TaskSelector
            value={task}
            onChange={setTask}
            disabled={disabled}
            className="w-full"
          />
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label>Fecha</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={disabled}
          />
        </div>

        {/* Times */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Hora inicio</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Hora fin</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Duration preview */}
        {durationMinutes > 0 && (
          <div className={`text-sm ${durationMinutes > 0 ? 'text-green-600' : 'text-destructive'}`}>
            Duración: {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m
          </div>
        )}

        {/* Description */}
        <div className="space-y-2">
          <Label>Descripción (opcional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notas sobre el trabajo..."
            disabled={disabled}
            rows={2}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || isSubmitting || disabled}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={disabled}>
              Cancelar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}