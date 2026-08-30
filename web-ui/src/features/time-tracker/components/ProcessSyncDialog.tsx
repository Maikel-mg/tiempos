import { useEffect, useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { wizardConfig } from '@/config/stores';
import { processOfflineService } from '../services/ProcessOfflineService';
import { normalizeForMatch } from '@/lib/normalize';
import type { ProcessSyncPlan, ProcessSyncProgress, ProcessSyncResult, DuplicateResolution } from '../types';

interface ProcessSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSyncComplete?: () => void;
}

export function ProcessSyncDialog({ open, onOpenChange, onSyncComplete }: ProcessSyncDialogProps) {
  const usured = wizardConfig.get()?.usuario ?? '';

  const [plan, setPlan] = useState<ProcessSyncPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const [selectedPullIds, setSelectedPullIds] = useState<Set<number>>(new Set());
  const [pullFilter, setPullFilter] = useState('');
  const [duplicateResolutions, setDuplicateResolutions] = useState<Record<number, DuplicateResolution>>({});

  const [progress, setProgress] = useState<ProcessSyncProgress | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<ProcessSyncResult | null>(null);

  const loadPlan = useCallback(async () => {
    if (!usured) {
      setPlanError('Configura tu usuario en Ajustes (usured)');
      return;
    }
    setLoadingPlan(true);
    setPlanError(null);
    setResult(null);
    setProgress(null);
    try {
      const p = await processOfflineService.planProcessSync(usured);
      setPlan(p);
      setSelectedPullIds(new Set(p.pull.map((pr) => pr.proceso)));
      setDuplicateResolutions({});
      setPullFilter('');
    } catch (e: unknown) {
      setPlanError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingPlan(false);
    }
  }, [usured]);

  useEffect(() => {
    if (open) loadPlan();
  }, [open, loadPlan]);

  const filteredPull = useMemo(() => {
    if (!plan) return [];
    if (!pullFilter.trim()) return plan.pull;
    const needle = normalizeForMatch(pullFilter);
    return plan.pull.filter((p) => normalizeForMatch(p.nombre).includes(needle));
  }, [plan, pullFilter]);

  const allFilteredSelected = useMemo(() => {
    if (filteredPull.length === 0) return false;
    return filteredPull.every((p) => selectedPullIds.has(p.proceso));
  }, [filteredPull, selectedPullIds]);

  const handleTogglePull = (procesoId: number, checked: boolean) => {
    setSelectedPullIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(procesoId);
      else next.delete(procesoId);
      return next;
    });
  };

  const handleDeselectAllFiltered = () => {
    setSelectedPullIds((prev) => {
      const next = new Set(prev);
      for (const p of filteredPull) next.delete(p.proceso);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedPullIds((prev) => {
      const next = new Set(prev);
      for (const p of filteredPull) next.add(p.proceso);
      return next;
    });
  };

  const handleDuplicateResolution = (pendingId: number, resolution: DuplicateResolution) => {
    setDuplicateResolutions((prev) => ({ ...prev, [pendingId]: resolution }));
  };

  const totalToCreate = useMemo(() => {
    if (!plan) return 0;
    const pushCount = plan.push.length;
    const createNewDupes = plan.duplicates.filter((d) => duplicateResolutions[d.pending.id] === 'createNew').length;
    return pushCount + createNewDupes;
  }, [plan, duplicateResolutions]);

  const handleSync = async (retryFailedIds?: number[]) => {
    if (!plan) return;
    setIsSyncing(true);
    setResult(null);
    setProgress({ stage: 'pull', completed: 0, total: plan.pull.length });
    try {
      const res = await processOfflineService.syncProcesses(
        usured,
        {
          selectedPullIds: Array.from(selectedPullIds),
          duplicateResolutions,
          retryFailedIds,
        },
        (p) => setProgress(p)
      );
      setResult(res);
      onSyncComplete?.();
      // reload plan to reflect new state (pending removed, cache updated)
      const refreshed = await processOfflineService.planProcessSync(usured);
      setPlan(refreshed);
      // keep selectedPullIds consistent with new pull
      setSelectedPullIds(new Set(refreshed.pull.map((pr) => pr.proceso)));
    } catch (e: unknown) {
      setPlanError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSyncing(false);
      setProgress(null);
    }
  };

  const handleRetryFailed = () => {
    if (!result || result.failedIds.length === 0) return;
    handleSync(result.failedIds);
  };

  const progressPercent = useMemo(() => {
    if (!progress) return 0;
    if (progress.total === 0) return 0;
    return Math.round((progress.completed / progress.total) * 100);
  }, [progress]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sincronizar procesos</DialogTitle>
          <DialogDescription>Revisa el estado real de la BBDD antes de sincronizar</DialogDescription>
        </DialogHeader>

        {loadingPlan ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Cargando estado de la BBDD...</p>
        ) : planError && !plan ? (
          <p className="text-sm text-destructive py-4">{planError}</p>
        ) : plan ? (
          <div className="space-y-6">
            {/* Pull section */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Procesos nuevos del sistema (pull) — {plan.pull.length}</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAllFiltered} disabled={isSyncing || filteredPull.length === 0}>
                    Seleccionar filtrados
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeselectAllFiltered} disabled={isSyncing || filteredPull.length === 0}>
                    Deseleccionar filtrados
                  </Button>
                </div>
              </div>
              <Input placeholder="Filtrar por nombre..." value={pullFilter} onChange={(e) => setPullFilter(e.target.value)} disabled={isSyncing} />
              {plan.pull.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay procesos nuevos en el sistema</p>
              ) : filteredPull.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ningún proceso coincide con el filtro</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto border rounded-md p-2">
                  <label className="flex items-center gap-2 text-xs font-medium px-1 py-1 border-b mb-1">
                    <Checkbox
                      checked={allFilteredSelected}
                      onCheckedChange={(c) => (c ? handleSelectAllFiltered() : handleDeselectAllFiltered())}
                      disabled={isSyncing}
                    />
                    {allFilteredSelected ? 'Deseleccionar filtrados' : 'Seleccionar filtrados'} ({filteredPull.length})
                  </label>
                  {filteredPull.map((p) => (
                    <label key={p.proceso} className="flex items-center gap-2 text-sm px-1 py-1 hover:bg-muted/50 rounded">
                      <Checkbox
                        checked={selectedPullIds.has(p.proceso)}
                        onCheckedChange={(c) => handleTogglePull(p.proceso, Boolean(c))}
                        disabled={isSyncing}
                      />
                      <span className="flex-1 truncate" title={p.nombre}>
                        {p.nombre}
                      </span>
                      <span className="text-xs text-muted-foreground">#{p.proceso}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{selectedPullIds.size} / {plan.pull.length} seleccionados (preseleccionados)</p>
            </section>

            {/* Push section */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Procesos Pendientes locales (push) — {plan.push.length}</h3>
              {plan.push.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay procesos pendientes para crear</p>
              ) : (
                <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-2">
                  {plan.push.map((p) => (
                    <div key={p.id} className="text-sm flex justify-between items-center px-1 py-1">
                      <span>{p.nombre}</span>
                      <span className="text-xs text-muted-foreground">ID {p.id} · {p.minutos} min</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Duplicates section */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Duplicados por nombre — {plan.duplicates.length}</h3>
              {plan.duplicates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay duplicados</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto border rounded-md p-2">
                  {plan.duplicates.map(({ pending, system }) => (
                    <div key={pending.id} className="border rounded p-3 space-y-2 bg-muted/20">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Local (pendiente {pending.id})</p>
                          <p className="font-medium truncate">{pending.nombre}</p>
                          <p className="text-xs text-muted-foreground">{pending.proyectoNombre ?? pending.proyectoId} · {pending.minutos} min</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Sistema (NProceso {system.proceso})</p>
                          <p className="font-medium truncate">{system.nombre}</p>
                          <p className="text-xs text-muted-foreground">#{system.proceso}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={duplicateResolutions[pending.id] === 'useExisting' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleDuplicateResolution(pending.id, 'useExisting')}
                          disabled={isSyncing}
                        >
                          Usar el existente
                        </Button>
                        <Button
                          variant={duplicateResolutions[pending.id] === 'createNew' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleDuplicateResolution(pending.id, 'createNew')}
                          disabled={isSyncing}
                        >
                          Crear nuevo igualmente
                        </Button>
                      </div>
                      {duplicateResolutions[pending.id] === 'useExisting' && (
                        <p className="text-xs text-muted-foreground">Se remapearán las Entradas de Tiempo al NProceso {system.proceso}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Plan por etapas con progreso */}
            {isSyncing && progress && (
              <div className="space-y-2 border rounded-md p-3 bg-blue-50/50">
                <p className="text-sm font-medium">Etapa: {progress.stage} — {progress.completed}/{progress.total}</p>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}

            {/* Result summary with partial failure */}
            {result && (
              <div className={`p-3 rounded-md border text-sm ${result.created.failed > 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                <p className="font-medium">
                  {result.created.succeeded}/{result.created.succeeded + result.created.failed} creados{result.created.failed > 0 ? `, ${result.created.failed} falló` : ''} · {result.pulled} importados · {result.remappedDuplicates} duplicados remapeados
                </p>
                {result.created.failed > 0 && (
                  <>
                    <ul className="list-disc list-inside mt-1">
                      {result.created.failures.map((f) => (
                        <li key={f.pendingId}>Pendiente {f.pendingId}: {f.error}</li>
                      ))}
                    </ul>
                    <Button variant="outline" size="sm" className="mt-2" onClick={handleRetryFailed} disabled={isSyncing}>
                      Reintentar solo lo fallado ({result.failedIds.length})
                    </Button>
                  </>
                )}
                {result.remappedEntries > 0 && <p className="mt-1">{result.remappedEntries} Entradas de Tiempo remapeadas</p>}
                {result.lastUpdated && <p className="text-xs mt-1">Última actualización: {new Date(result.lastUpdated).toLocaleString()}</p>}
              </div>
            )}

            {planError && <p className="text-sm text-destructive">{planError}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSyncing}>
                Cerrar
              </Button>
              <Button onClick={() => handleSync()} disabled={isSyncing || loadingPlan || totalToCreate === 0 && selectedPullIds.size === 0 && plan.duplicates.length === 0}>
                {isSyncing ? 'Sincronizando...' : `Aplicar (${totalToCreate} creaciones, ${selectedPullIds.size} imports)`}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
