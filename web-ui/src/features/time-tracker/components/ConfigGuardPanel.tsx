import { AlertTriangle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

/**
 * Panel de guard que reemplaza la acción de ejecutar cuando
 * falta la configuración de base de datos (server o database).
 * Muestra un warning claro y un CTA para ir a Settings.
 */
export function ConfigGuardPanel() {
  const navigate = useNavigate();

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1 space-y-2">
          <p className="text-sm text-amber-800">
            Falta la configuración de base de datos. Completá el servidor y la base de datos en Settings para poder sincronizar.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/settings')}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Ir a Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
