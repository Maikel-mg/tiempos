import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, Loader2 } from 'lucide-react';
import { ProcessSelectorButton } from './ProcessSelectorButton';
import { parseImportJson, type ParsedImport } from '../lib/parseImportEntries';
import { timeTrackingService } from '../services/timeTrackingService';
import type { Proceso } from '../types';

function formatHours(minutes: number): string {
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/**
 * Recupera historial de Registros desde un fichero JSON. Todo el lote entra con la
 * Tarea elegida y pendiente de sincronizar, así que después se revisa y se sincroniza
 * desde la Agenda con el panel de siempre.
 */
export function ImportEntriesCard() {
  const [proceso, setProceso] = useState<Proceso | null>(null);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFile = async (file: File | undefined) => {
    setParsed(null);
    setFileName(file?.name ?? '');
    if (!file) return;
    setParsed(parseImportJson(await file.text()));
  };

  const handleImport = async () => {
    if (!proceso || !parsed?.ok) return;
    setImporting(true);
    try {
      const { imported, skipped } = await timeTrackingService.importEntries(parsed.entries, proceso);
      toast.success(`${imported} registro(s) importados`, {
        description: [
          'Quedan pendientes de sincronizar.',
          skipped > 0 ? `${skipped} ya estaban en local y se han omitido.` : '',
        ]
          .filter(Boolean)
          .join(' '),
      });
      setParsed(null);
      setFileName('');
    } catch (error) {
      toast.error('No se pudo importar', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Importar Registros
        </CardTitle>
        <CardDescription>
          Da de alta en bloque Registros desde un fichero JSON (por ejemplo, un historial
          reconstruido a mano). Todos entran con la Tarea que elijas aquí y pendientes de
          sincronizar: revísalos en la Agenda antes de subirlos a la base de datos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Tarea (Proceso) para todo el lote</Label>
          <ProcessSelectorButton value={proceso} onChange={setProceso} className="w-full" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="import-file">Fichero JSON</Label>
          <Input
            id="import-file"
            type="file"
            accept="application/json,.json"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <p className="text-sm text-muted-foreground">
            Formato: <code>{'[{ "date": "YYYY-MM-DD", "startTime": "HH:MM", "endTime": "HH:MM", "description": "..." }]'}</code>
          </p>
        </div>

        {parsed && !parsed.ok && (
          <p className="text-sm text-destructive">{parsed.reason}</p>
        )}

        {parsed?.ok && (
          <div className="rounded-md border p-3 text-sm space-y-1">
            <p className="font-medium">{fileName}</p>
            <p className="text-muted-foreground">
              {parsed.entries.length} registro(s) · {formatHours(parsed.totalMinutes)} · del{' '}
              {parsed.entries[0].date} al {parsed.entries[parsed.entries.length - 1].date}
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => void handleImport()}
            disabled={importing || !proceso || !parsed?.ok}
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              'Importar'
            )}
          </Button>
          {!proceso && (
            <p className="text-sm text-muted-foreground self-center">Elige antes una tarea.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
