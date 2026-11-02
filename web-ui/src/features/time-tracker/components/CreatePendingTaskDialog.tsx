import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Loader2, UploadCloud } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SinFasesSelector } from '@/components/SinFasesSelector';
import { wizardConfig } from '@/config/stores';
import { isValidDDMMYYYY } from '@/lib/sql-utils';
import { getLocalTask, materializeLocalTask } from '../services/localTasksService';

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
 * elegir contra la BD real, así que se piden aquí, en el momento de crearla. Las
 * fechas previstas también se pueden corregir: se apuntaron sin conexión y una
 * fecha imposible (31/11/2026) rompe la conversión a datetime en SQL Server.
 */
export function CreatePendingTaskDialog({
  proceso,
  nombre,
  onOpenChange,
  onCreated,
}: CreatePendingTaskDialogProps) {
  const [fase, setFase] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cada tarea se materializa con su propia fase y sus fechas: al cambiar de tarea
  // se descarta lo elegido y se recargan las fechas guardadas.
  useEffect(() => {
    setFase('');
    setError(null);
    if (proceso === null) return;
    let vigente = true;
    void getLocalTask(proceso).then((local) => {
      if (!vigente || !local) return;
      setFechaInicio(local.dto.fechaInicio ?? '');
      setFechaFin(local.dto.fechaFin ?? '');
    });
    return () => {
      vigente = false;
    };
  }, [proceso]);

  const fechasValidas = isValidDDMMYYYY(fechaInicio) && isValidDDMMYYYY(fechaFin);

  const handleCreate = async () => {
    if (proceso === null || !fase || !fechasValidas) return;

    setIsCreating(true);
    setError(null);
    try {
      const { movidos } = await materializeLocalTask(proceso, { fase, fechaInicio, fechaFin });
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
            tiempo se moverán a la tarea creada. Revisá también las fechas previstas.
          </DialogDescription>
        </DialogHeader>

        <SinFasesSelector
          config={{ usuario: wizardConfig.get()?.usuario ?? '', fase: '' }}
          onTaskChange={(updates) => {
            if (updates.fase !== undefined) setFase(updates.fase);
          }}
          disabled={isCreating}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="pending-fecha-inicio">Inicio previsto</Label>
            <Input
              id="pending-fecha-inicio"
              value={fechaInicio}
              placeholder="dd/mm/aaaa"
              onChange={(e) => setFechaInicio(e.target.value)}
              disabled={isCreating}
              aria-invalid={!isValidDDMMYYYY(fechaInicio)}
              className={isValidDDMMYYYY(fechaInicio) ? '' : 'border-destructive'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pending-fecha-fin">Fin previsto</Label>
            <Input
              id="pending-fecha-fin"
              value={fechaFin}
              placeholder="dd/mm/aaaa"
              onChange={(e) => setFechaFin(e.target.value)}
              disabled={isCreating}
              aria-invalid={!isValidDDMMYYYY(fechaFin)}
              className={isValidDDMMYYYY(fechaFin) ? '' : 'border-destructive'}
            />
          </div>
        </div>

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
          <Button onClick={handleCreate} disabled={isCreating || !fase || !fechasValidas}>
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
