import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Loader2, UploadCloud } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SinFasesSelector } from '@/components/SinFasesSelector';
import { wizardConfig } from '@/config/stores';
import { materializeLocalTask } from '../services/localTasksService';

interface CreatePendingTaskDialogProps {
  /** Id negativo de la tarea local. null = diálogo cerrado. */
  proceso: number | null;
  nombre: string;
  onOpenChange: (open: boolean) => void;
  /** Recarga la lista de tareas tras crearla en la BD. */
  onCreated: () => void | Promise<void>;
}

/**
 * Cierra el ciclo de una tarea creada sin conexión: proyecto y fase sólo se pueden
 * elegir contra la BD real, así que se piden aquí, en el momento de crearla.
 */
export function CreatePendingTaskDialog({
  proceso,
  nombre,
  onOpenChange,
  onCreated,
}: CreatePendingTaskDialogProps) {
  const [fase, setFase] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cada tarea se materializa con su propia fase: al cambiar de tarea se descarta.
  useEffect(() => {
    setFase('');
    setError(null);
  }, [proceso]);

  const handleCreate = async () => {
    if (proceso === null || !fase) return;

    setIsCreating(true);
    setError(null);
    try {
      const { movidos } = await materializeLocalTask(proceso, fase);
      toast.success(
        `Tarea creada en la base de datos · ${movidos} registro(s) reapuntados`
      );
      onOpenChange(false);
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la tarea');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={proceso !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Crear «{nombre}» en la base de datos</DialogTitle>
          <DialogDescription>
            La tarea se registró sin conexión. Elegí el proyecto y la fase reales: sus registros de
            tiempo se moverán a la tarea creada.
          </DialogDescription>
        </DialogHeader>

        <SinFasesSelector
          config={{ usuario: wizardConfig.get()?.usuario ?? '', fase: '' }}
          onTaskChange={(updates) => {
            if (updates.fase !== undefined) setFase(updates.fase);
          }}
          disabled={isCreating}
        />

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No se pudo crear la tarea</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !fase}>
            {isCreating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4 mr-2" />
            )}
            Crear tarea
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
