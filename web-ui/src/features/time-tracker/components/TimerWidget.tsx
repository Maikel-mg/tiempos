import { useState } from 'react';
import { Play, Square, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProcessSelectorButton } from './ProcessSelectorButton';
import type { Proceso } from '../types';

interface TimerWidgetProps {
  isRunning: boolean;
  elapsed: number;
  timerTask?: string;
  onStart: (taskId: number, taskName: string) => Promise<void>;
  onStop: () => Promise<void>;
  onCancel?: () => Promise<void>;
}

/**
 * Formatea segundos a HH:MM:SS
 */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Widget del temporizador con controls de Start/Stop.
 * Muestra el tiempo transcurrido y permite seleccionar tarea.
 */
export function TimerWidget({ isRunning, elapsed, timerTask, onStart, onStop, onCancel }: TimerWidgetProps) {
  const [selectedTask, setSelectedTask] = useState<Proceso | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = async () => {
    if (!selectedTask) return;
    setIsLoading(true);
    try {
      await onStart(selectedTask.proceso, selectedTask.nombre);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      await onStop();
      setSelectedTask(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!onCancel) return;
    setIsLoading(true);
    try {
      await onCancel();
      setSelectedTask(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={isRunning ? 'border-green-500 bg-green-50/50' : ''}>
      <CardContent className="p-6">
        <div className="flex items-center gap-6">
          {/* Timer Display */}
          <div className={`
            text-5xl font-mono font-bold tabular-nums tracking-tight
            ${isRunning ? 'text-green-600' : 'text-foreground'}
          `}>
            {formatDuration(elapsed)}
          </div>

          {/* Separator */}
          <div className="h-12 w-px bg-border" />

          {/* Task Selector or Current Task */}
          <div className="flex-1 min-w-0">
            {!isRunning ? (
              <ProcessSelectorButton
                value={selectedTask}
                onChange={setSelectedTask}
                className="w-full max-w-md"
              />
            ) : timerTask ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-lg font-medium text-green-700">
                  {timerTask}
                </span>
              </div>
            ) : null}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {!isRunning ? (
              <Button
                onClick={handleStart}
                disabled={!selectedTask || isLoading}
                className="bg-green-600 hover:bg-green-700 gap-2"
                size="lg"
              >
                <Play className="w-5 h-5" />
                Iniciar
              </Button>
            ) : (
              <>
                {onCancel && (
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isLoading}
                    size="lg"
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Cancelar
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={handleStop}
                  disabled={isLoading}
                  size="lg"
                  className="gap-2"
                >
                  <Square className="w-5 h-5" />
                  Parar
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}