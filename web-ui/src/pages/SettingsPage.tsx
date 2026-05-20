import { useState, useEffect } from 'react';
import {
  Settings,
  Server,
  Database,
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { dbConfig, wizardConfig } from '@/config/stores';
import { useTestDbConnection } from '@/features/live-entries/mutations/sql-mutations';

interface DbConfig {
  server: string;
  database: string;
  username: string;
  password: string;
}

interface WizardConfig {
  usuario: string;
  tipoHora: string;
  fase: string;
}

export function SettingsPage() {
  const [config, setConfig] = useState<DbConfig>({
    server: '',
    database: '',
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [wizardCfg, setWizardCfg] = useState<WizardConfig>({
    usuario: '',
    tipoHora: '11',
    fase: '',
  });

  const testMutation = useTestDbConnection();

  useEffect(() => {
    const saved = dbConfig.get();
    setConfig({
      server: saved?.server ?? '',
      database: saved?.database ?? '',
      username: saved?.username ?? '',
      password: saved?.password ?? '',
    });

    const savedWizard = wizardConfig.get();
    if (savedWizard) {
      setWizardCfg({
        usuario: savedWizard.usuario ?? '',
        tipoHora: savedWizard.tipoHora ?? '11',
        fase: savedWizard.fase ?? '',
      });
    }
  }, []);

  const handleSave = () => {
    dbConfig.set({
      server: config.server,
      database: config.database,
      username: config.username,
      password: config.password || '',
    });
    toast.success('Configuración guardada', {
      description: 'Los datos de conexión se han guardado correctamente.',
    });
  };

  const handleReset = () => {
    const saved = dbConfig.get();
    setConfig({
      server: saved?.server ?? '',
      database: saved?.database ?? '',
      username: saved?.username ?? '',
      password: saved?.password ?? '',
    });
    toast.info('Restablecido', {
      description: 'Se han restablecido los valores guardados.',
    });
  };

  const handleWizardSave = () => {
    wizardConfig.set({
      usuario: wizardCfg.usuario,
      tipoHora: wizardCfg.tipoHora,
    });
    toast.success('Preferencias guardadas', {
      description: 'Los datos de importación se han guardado correctamente.',
    });
  };

  const handleWizardReset = () => {
    const saved = wizardConfig.get();
    setWizardCfg({
      usuario: saved?.usuario ?? '',
      tipoHora: saved?.tipoHora ?? '11',
      fase: saved?.fase ?? '',
    });
    toast.info('Restablecido', {
      description: 'Se han restablecido las preferencias de importación.',
    });
  };

  const handleTest = async () => {
    if (!config.server || !config.database || !config.username) {
      toast.error('Faltan campos', {
        description: 'Por favor completa servidor, base de datos y usuario.',
      });
      return;
    }

    try {
      const result = await testMutation.mutateAsync({
        server: config.server,
        database: config.database,
        username: config.username,
        password: config.password || '',
      });
      toast.success('Conexión exitosa', {
        description: result.message,
      });
    } catch (error: any) {
      toast.error('Error de conexión', {
        description: error.message || 'No se pudo conectar a la base de datos.',
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Configuración
        </h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Conexión a Base de Datos
            </CardTitle>
            <CardDescription>
              Configura los parámetros de conexión a SQL Server para ejecutar consultas directas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="server">Servidor</Label>
                <div className="relative">
                  <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="server"
                    placeholder="localhost\SQLEXPRESS"
                    value={config.server}
                    onChange={(e) => setConfig({ ...config, server: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="database">Base de Datos</Label>
                <div className="relative">
                  <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="database"
                    placeholder="TiemposDB"
                    value={config.database}
                    onChange={(e) => setConfig({ ...config, database: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="sa"
                    value={config.username}
                    onChange={(e) => setConfig({ ...config, username: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={config.password}
                    onChange={(e) => setConfig({ ...config, password: e.target.value })}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Probando...
                  </>
                ) : (
                  'Probar Conexión'
                )}
              </Button>
              <Button variant="outline" onClick={handleSave}>
                Guardar
              </Button>
              <Button variant="ghost" onClick={handleReset}>
                Restablecer
              </Button>
            </div>

              {testMutation.isSuccess && (
                <Alert variant="default">
                  <CheckCircle className="w-4 h-4" />
                  <AlertTitle>Conexión exitosa</AlertTitle>
                  <AlertDescription>
                    {testMutation.data?.message}
                  </AlertDescription>
                </Alert>
              )}

              {testMutation.isError && (
                <Alert variant="destructive">
                  <XCircle className="w-4 h-4" />
                  <AlertTitle>Error de conexión</AlertTitle>
                  <AlertDescription>
                    {(testMutation.error as Error)?.message || 'Error desconocido'}
                  </AlertDescription>
                </Alert>
              )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Preferencias de Importación
            </CardTitle>
            <CardDescription>
              Configura los datos que se aplican al generar SQL de tiempos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wizard-usuario">Usuario</Label>
                <Input
                  id="wizard-usuario"
                  placeholder="MG01"
                  value={wizardCfg.usuario}
                  onChange={(e) => setWizardCfg({ ...wizardCfg, usuario: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-tipoHora">Tipo de Hora</Label>
                <Input
                  id="wizard-tipoHora"
                  type="number"
                  placeholder="11"
                  value={wizardCfg.tipoHora}
                  onChange={(e) => setWizardCfg({ ...wizardCfg, tipoHora: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-fase">Fase</Label>
                <Input
                  id="wizard-fase"
                  value={wizardCfg.fase || '—'}
                  readOnly
                  disabled
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleWizardSave}>
                Guardar
              </Button>
              <Button variant="ghost" onClick={handleWizardReset}>
                Restablecer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
