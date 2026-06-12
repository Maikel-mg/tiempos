import { useState, useMemo } from 'react';
import { Play, Loader2, Check, XCircle, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TimeEntry } from '../types';
import type { SyncResultEntry } from '../services/timeEntrySyncService';
import { syncTimeEntries } from '../services/timeEntrySyncService';
import { wizardConfig, dbConfig } from '@/config/stores';
import { useConfigGuard } from '../hooks/useConfigGuard';
import { ConfigGuardPanel } from './ConfigGuardPanel';

interface SyncPanelProps {
  selectedEntries: TimeEntry[];
  totalPendingCount: number;
  onSyncComplete: (ids: string[]) => Promise<void>;
}

/**
 * Panel de sincronización que permite sincronizar registros de tiempo
 * hacia SQL Server usando el servicio timeEntrySyncService.
 */
export function SyncPanel({ selectedEntries, totalPendingCount, onSyncComplete }: SyncPanelProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResultEntry[] | null>(null);
  const [overallSuccess, setOverallSuccess] = useState<boolean | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const { isReady } = useConfigGuard();

  const config = useMemo(() => {
    try {
      const stored = wizardConfig.get();
      return stored ? {
        usuario: stored.usuario,
      } : { usuario: '' };
    } catch {
      return { usuario: '' };
    }
  }, []);

  const handleExecute = async () => {
    const dbConfigData = dbConfig.get();
    if (!dbConfigData || !dbConfigData.server || !dbConfigData.database) {
      setSyncResults([]);
      setOverallSuccess(false);
      return;
    }

    setIsExecuting(true);
    setSyncResults(null);
    setOverallSuccess(null);

    try {
      const outcome = await syncTimeEntries(selectedEntries, dbConfigData, config.usuario);
      setOverallSuccess(outcome.success);
      setSyncResults(outcome.results);

      if (outcome.success) {
        const succeededIds = outcome.results.filter(r => r.success).map(r => r.entryId);
        if (succeededIds.length > 0) {
          await onSyncComplete(succeededIds);
        }
      }
    } catch {
      setSyncResults([]);
      setOverallSuccess(false);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/30">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Database className="w-5 h-5" />
          {selectedEntries.length < totalPendingCount
            ? `Sincronizar ${selectedEntries.length} de ${totalPendingCount} pendientes`
            : `Sincronizar ${selectedEntries.length} registros`
          }
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auto-sync toggle */}
        <div className="flex items-center gap-2">
          <Switch 
            id="autoSyncToggle" 
            checked={autoSyncEnabled} 
            onCheckedChange={setAutoSyncEnabled}
          />
          <Label htmlFor="autoSyncToggle" className="text-sm">
            Sincronización automática al crear registro
          </Label>
        </div>

        {/* Config guard: replace execute button when config is incomplete */}
        {!isReady ? (
          <ConfigGuardPanel />
        ) : (
          /* Execute button */
          <div className="flex gap-2">
            <Button
              onClick={handleExecute}
              disabled={isExecuting || selectedEntries.length === 0}
              size="sm"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ejecutando...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Ejecutar en BBDD
                </>
              )}
            </Button>
          </div>
        )}

        {/* Per-entry results */}
        {syncResults && syncResults.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {syncResults.map((result) => {
              const entry = selectedEntries.find(e => e.id === result.entryId);
              return (
                <div
                  key={result.entryId}
                  className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                    result.success
                      ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 text-green-800 dark:text-green-200'
                      : 'bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-800 dark:text-red-200'
                  }`}
                >
                  {result.success ? (
                    <Check className="w-4 h-4 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <span className="font-medium">
                      {entry?.taskName ?? result.entryId}
                    </span>
                    {result.success ? (
                      <span className="ml-2">— Sincronizado</span>
                    ) : (
                      <span className="ml-2">— {result.error ?? 'Error desconocido'}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Overall result */}
        {overallSuccess !== null && syncResults && (
          <div className={`p-3 rounded-lg ${overallSuccess ? 'bg-green-50 dark:bg-green-950/30 border border-green-200' : 'bg-red-50 dark:bg-red-950/30 border border-red-200'}`}>
            <p className={overallSuccess ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
              {overallSuccess ? '✓ ' : '✗ '}
              {overallSuccess ? 'Sincronización exitosa' : 'Error en la sincronización'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
