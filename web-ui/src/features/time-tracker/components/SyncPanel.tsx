import { useState, useMemo } from 'react';
import { Copy, Download, Play, Loader2, Check, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateSQLFromObjects } from '@/lib/sql-generator';
import { loadMappings } from '@/lib/task-mapping-storage';
import type { TimeEntry } from '../types';

interface SyncPanelProps {
  selectedEntries: TimeEntry[];
  onSyncComplete: (ids: string[]) => Promise<void>;
}

/**
 * Desencripta la contraseña de la configuración de BBDD.
 */
function decryptPassword(encoded: string): string {
  try {
    return atob(encoded);
  } catch {
    return '';
  }
}

/**
 * Panel de sincronización que permite:
 * - Generar SQL para los registros seleccionados
 * - Copiar SQL al portapapeles
 * - Descargar SQL como archivo
 * - Ejecutar SQL directamente en la BBDD
 */
export function SyncPanel({ selectedEntries, onSyncComplete }: SyncPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false); // Por defecto OFF (como PRD)

  // Get config from localStorage
  const config = useMemo(() => {
    try {
      const stored = localStorage.getItem('wizard_config');
      return stored ? JSON.parse(stored) : { usuario: '', fase: '', tipoHora: '11' };
    } catch {
      return { usuario: '', fase: '', tipoHora: '11' };
    }
  }, []);

  // Get task mappings
  const taskMapping = useMemo(() => loadMappings(), []);

  // Generate SQL
  const sqlResult = useMemo(() => {
    return generateSQLFromObjects({
      entries: selectedEntries,
      taskMapping,
      config
    });
  }, [selectedEntries, taskMapping, config]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sqlResult.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([sqlResult.sql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-entries-${new Date().toISOString().split('T')[0]}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExecute = async () => {
    // Get DB config
    const dbConfigStr = localStorage.getItem('db_connection_config');
    if (!dbConfigStr) {
      setResult({ success: false, message: 'Configura la conexión a la BBDD primero' });
      return;
    }

    let dbConfig;
    try {
      dbConfig = JSON.parse(dbConfigStr);
    } catch {
      setResult({ success: false, message: 'Error al leer la configuración de BBDD' });
      return;
    }

    if (!dbConfig.server || !dbConfig.database) {
      setResult({ success: false, message: 'Configura la conexión a la BBDD primero' });
      return;
    }

    setIsExecuting(true);
    setResult(null);

    try {
      const response = await fetch('http://localhost:3001/api/execute-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: dbConfig.server,
          database: dbConfig.database,
          username: dbConfig.username,
          password: dbConfig.password ? decryptPassword(dbConfig.password) : '',
          sqlStatements: sqlResult.statements
        })
      });
      
      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        await onSyncComplete(selectedEntries.map(e => e.id));
      }
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Error desconocido' });
    } finally {
      setIsExecuting(false);
    }
  };

  const hasErrors = sqlResult.errors && sqlResult.errors.length > 0;

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Database className="w-5 h-5" />
          Sincronizar {selectedEntries.length} registros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auto-sync toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoSyncToggle"
            checked={autoSyncEnabled}
            onChange={(e) => setAutoSyncEnabled(e.target.checked)}
            className="w-4 h-4"
          />
          <Label htmlFor="autoSyncToggle" className="text-sm">
            Sincronización automática al crear registro
          </Label>
        </div>

        {/* SQL Preview */}
        {hasErrors && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            {sqlResult.errors.length} registro(s) no se pudieron procesar. Verifica el mapeo de tareas.
          </div>
        )}

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 text-sm font-medium flex items-center justify-between">
            <span>SQL Preview</span>
            <span className="text-muted-foreground">
              {sqlResult.processed} procesados
              {hasErrors && <span className="text-destructive ml-2">• {sqlResult.errors.length} errores</span>}
            </span>
          </div>
          <ScrollArea className="h-[180px]">
            <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
              {sqlResult.sql || '-- No hay SQL generado'}
            </pre>
          </ScrollArea>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={handleCopy}
            disabled={!sqlResult.sql}
            size="sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copiar SQL
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleDownload}
            disabled={!sqlResult.sql}
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar
          </Button>
          
          <Button 
            onClick={handleExecute}
            disabled={isExecuting || !sqlResult.sql}
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

        {/* Result */}
        {result && (
          <div className={`p-3 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <p className={result.success ? 'text-green-800' : 'text-red-800'}>
              {result.success ? '✓ ' : '✗ '}
              {result.success ? 'Sincronización exitosa' : 'Error'}
              {result.message && `: ${result.message}`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}