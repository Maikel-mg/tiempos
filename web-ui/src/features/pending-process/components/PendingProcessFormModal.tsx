import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { wizardConfig } from '@/config/stores';
import { processOfflineService } from '@/features/time-tracker/services/ProcessOfflineService';
import type { ProcesoPendiente, OfflineProjectSelection } from '@/features/time-tracker/types';
import type { ProjectTreeResponse } from '@/features/projects/types';

export interface PendingProcessFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided with a negative id, the modal edits instead of creating. */
  initialData?: ProcesoPendiente | null;
  /** Prefill for create mode (e.g. a proposal suggested name). */
  defaultNombre?: string;
  /** Prefill for create mode (e.g. proposal hours * 60). */
  defaultMinutos?: number;
  /** Called after a successful create or update. */
  onSaved?: (pendiente: ProcesoPendiente) => void;
}

export interface FaseOption {
  id: string;
  faseId: number;
  faseNombre: string;
  label: string;
}

export function flattenProjectFases(tree: ProjectTreeResponse): FaseOption[] {
  const seen = new Set<number>();
  const result: FaseOption[] = [];
  for (const disciplina of tree.disciplinas) {
    for (const fase of disciplina.fases) {
      if (seen.has(fase.fase)) continue;
      seen.add(fase.fase);
      result.push({
        id: String(fase.fase),
        faseId: fase.fase,
        faseNombre: fase.nombre,
        label: `${disciplina.nombre} / ${fase.nombre}`,
      });
    }
  }
  return result;
}

const NO_OFFLINE_HINT = 'Marca primero proyectos como disponibles offline en Proyectos';

/**
 * Modal de creación/edición de un Proceso Pendiente. Para crear, el usuario
 * elige un proyecto marcado como offline (getOfflineProjectSelections) y una
 * fase de su árbol cacheado (getProjectTree). En modo edición prellena el
 * formulario con initialData y actualiza vía updatePendingProcess.
 */
export function PendingProcessFormModal({
  open,
  onOpenChange,
  initialData,
  defaultNombre,
  defaultMinutos,
  onSaved,
}: PendingProcessFormModalProps) {
  const isEdit = Boolean(initialData && initialData.id < 0);

  const [nombre, setNombre] = useState('');
  const [proyectoKey, setProyectoKey] = useState<string>('');
  const [faseId, setFaseId] = useState<string>('');
  const [minutos, setMinutos] = useState('60');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [fechaEstimacion, setFechaEstimacion] = useState('');
  const [selections, setSelections] = useState<OfflineProjectSelection[]>([]);
  const [tree, setTree] = useState<ProjectTreeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const usured = wizardConfig.get()?.usuario ?? '';

  // Reset form whenever the modal opens with a given target.
  useEffect(() => {
    if (!open) return;
    setNombre(initialData?.nombre ?? defaultNombre ?? '');
    setProyectoKey('');
    setFaseId(initialData?.faseId != null ? String(initialData.faseId) : '');
    setMinutos(String(initialData?.minutos ?? defaultMinutos ?? 60));
    setFechaInicio(initialData?.fechaInicio ?? '');
    setFechaFin(initialData?.fechaFin ?? '');
    setFechaEstimacion(initialData?.fechaEstimacion ?? '');
    setTree(null);
    setLoadError(null);
  }, [open, initialData, defaultNombre, defaultMinutos]);

  // Load offline project selections when the modal opens.
  useEffect(() => {
    if (!open || !usured) return;
    setLoading(true);
    processOfflineService
      .getOfflineProjectSelections(usured)
      .then((data) => setSelections(data))
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : 'Error al cargar proyectos offline'))
      .finally(() => setLoading(false));
  }, [open, usured]);

  // In edit mode, resolve the project from initialData.proyectoId (CodCli).
  useEffect(() => {
    if (!open || !isEdit || !initialData?.proyectoId || selections.length === 0) return;
    const match = selections.find((s) => s.codCli === initialData.proyectoId);
    if (match) {
      setProyectoKey(projectKey(match));
    }
  }, [open, isEdit, initialData, selections]);

  const selectedProject = useMemo(() => {
    if (!proyectoKey) return undefined;
    return selections.find((s) => projectKey(s) === proyectoKey);
  }, [proyectoKey, selections]);

  // Load the project tree of the selected project to populate the fase list.
  useEffect(() => {
    if (!open || !usured || !selectedProject) {
      setTree(null);
      return;
    }
    let cancelled = false;
    setTree(null);
    processOfflineService
      .getProjectTree(usured, selectedProject.codCli, selectedProject.proyecto)
      .then((t) => {
        if (!cancelled) setTree(t);
      })
      .catch(() => {
        if (!cancelled) setTree(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, usured, selectedProject]);

  const fases = useMemo(() => (tree ? flattenProjectFases(tree) : []), [tree]);

  const canSave = !saving && Boolean(nombre.trim()) && Boolean(selectedProject) && Number(minutos) > 0;

  const handleSave = useCallback(async () => {
    if (!canSave || !selectedProject) return;
    setSaving(true);
    try {
      const faseOption = fases.find((f) => f.id === faseId);
      const base = {
        nombre: nombre.trim(),
        proyectoId: selectedProject.codCli,
        proyectoNombre: selectedProject.nomProy,
        clienteId: selectedProject.codCli,
        clienteNombre: selectedProject.nomCliente,
        faseId: faseOption?.faseId,
        faseNombre: faseOption?.faseNombre,
        minutos: Number(minutos),
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
        fechaEstimacion: fechaEstimacion || undefined,
      };

      let pendiente: ProcesoPendiente | null;
      if (isEdit && initialData) {
        pendiente = await processOfflineService.updatePendingProcess(usured, initialData.id, base);
      } else {
        pendiente = await processOfflineService.createPendingProcess(usured, base);
      }
      if (pendiente) {
        onSaved?.(pendiente);
      }
    } finally {
      setSaving(false);
    }
  }, [canSave, selectedProject, fases, faseId, nombre, minutos, fechaInicio, fechaFin, fechaEstimacion, isEdit, initialData, usured, onSaved]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar proceso pendiente' : 'Crear proceso sin conexión'}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Cargando proyectos offline...</p>
        ) : loadError ? (
          <p className="text-sm text-destructive py-6 text-center">{loadError}</p>
        ) : selections.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{NO_OFFLINE_HINT}</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pp-nombre">Nombre del proceso</Label>
              <Input
                id="pp-nombre"
                placeholder="Nombre del proceso"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Proyecto (offline)</Label>
              <Select
                value={proyectoKey}
                onValueChange={(v: string) => {
                  setProyectoKey(v);
                  setFaseId('');
                }}
              >
                <SelectTrigger aria-label="Proyecto">
                  <SelectValue placeholder="Seleccionar proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {selections.map((s) => (
                    <SelectItem key={projectKey(s)} value={projectKey(s)}>
                      {s.nomProy} — {s.nomCliente}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Fase</Label>
              <Select value={faseId} onValueChange={setFaseId}>
                <SelectTrigger aria-label="Fase" disabled={!selectedProject}>
                  <SelectValue placeholder="Seleccionar fase" />
                </SelectTrigger>
                <SelectContent>
                  {fases.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pp-minutos">Minutos estimados</Label>
              <Input
                id="pp-minutos"
                type="number"
                min={1}
                placeholder="Minutos estimados"
                value={minutos}
                onChange={(e) => setMinutos(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pp-inicio">Fecha inicio</Label>
                <Input id="pp-inicio" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pp-fin">Fecha fin</Label>
                <Input id="pp-fin" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pp-estimacion">Fecha estimación</Label>
              <Input id="pp-estimacion" type="date" value={fechaEstimacion} onChange={(e) => setFechaEstimacion(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={!canSave}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function projectKey(s: OfflineProjectSelection): string {
  return `${s.codCli}::${s.proyecto}`;
}
