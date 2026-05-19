import { useState, useEffect } from 'react';
import { Database, Server, User, Lock, Eye, EyeOff, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dbConfig as dbConfigStore } from '@/config/stores';

export interface DbConfig {
    server: string;
    database: string;
    username: string;
    password?: string;
}

export interface DBConnectionProps {
    dbConfig: DbConfig;
    onUpdateDbConfig: (config: DbConfig) => void;
}



export function DBConnection({ dbConfig, onUpdateDbConfig }: DBConnectionProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);

  useEffect(() => {
    const saved = dbConfigStore.get();
    const hasSavedConfig = !!saved;
    setHasConfig(hasSavedConfig);

    // Set initial collapsed state: collapsed if config exists, expanded if not
    setIsCollapsed(hasSavedConfig);

    if (saved) {
      try {
        onUpdateDbConfig({
          server: saved.server || '',
          database: saved.database || '',
          username: saved.username || '',
          password: saved.password || ''
        });
      } catch (e) {
        console.error('Failed to load saved DB config');
      }
    }
  }, []);

  const handleSave = () => {
    dbConfigStore.set({
      server: dbConfig.server,
      database: dbConfig.database,
      username: dbConfig.username,
      password: dbConfig.password || ''
    });
    setHasConfig(true);
  };

    const handleClear = () => {
        dbConfigStore.reset();
        onUpdateDbConfig({
            server: '',
            database: '',
            username: '',
            password: ''
        });
        setTestResult(null);
        setHasConfig(false);
        setIsCollapsed(false); // Expand panel when config is cleared
    };

    const handleTestConnection = async () => {
        if (!dbConfig.server || !dbConfig.database || !dbConfig.username) {
            setTestResult({
                success: false,
                message: 'Please fill in all connection fields'
            });
            return;
        }

        setIsTesting(true);
        setTestResult(null);

        try {
            const response = await fetch('http://localhost:3001/api/time-entries', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();
            setTestResult(data);
        } catch (error: any) {
            setTestResult({
                success: false,
                message: `Connection failed: ${error.message}`,
                suggestions: ['Make sure backend server is running on port 3001', 'Check network connectivity']
            });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <Card className="bg-muted/30">
            <CardHeader className="cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Database className="w-4 h-4" />
                            Conexión a Base de Datos
                        </CardTitle>
                        <CardDescription>
                            Configura la conexión a SQL Server para ejecutar SQL directamente
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasConfig && isCollapsed && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                Configurado
                            </span>
                        )}
                        {isCollapsed ? (
                            <ChevronDown className="w-5 h-5" />
                        ) : (
                            <ChevronUp className="w-5 h-5" />
                        )}
                    </div>
                </div>
            </CardHeader>
            {!isCollapsed && (
                <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="server">Servidor</Label>
                        <div className="relative">
                            <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                id="server"
                                placeholder="localhost\\SQLEXPRESS"
                                value={dbConfig.server}
                                onChange={(e) => onUpdateDbConfig({ ...dbConfig, server: e.target.value })}
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
                                value={dbConfig.database}
                                onChange={(e) => onUpdateDbConfig({ ...dbConfig, database: e.target.value })}
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
                                value={dbConfig.username}
                                onChange={(e) => onUpdateDbConfig({ ...dbConfig, username: e.target.value })}
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
                                value={dbConfig.password || ''}
                                onChange={(e) => onUpdateDbConfig({ ...dbConfig, password: e.target.value })}
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

                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        onClick={handleTestConnection}
                        disabled={isTesting}
                    >
                        {isTesting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Probando...
                            </>
                        ) : (
                            'Probar Conexión'
                        )}
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={handleSave}
                    >
                        Guardar
                    </Button>
                    <Button 
                        variant="ghost" 
                        onClick={handleClear}
                    >
                        Limpiar
                    </Button>
                </div>

                {testResult && (
                    <Alert variant={testResult.success ? 'default' : 'destructive'}>
                        {testResult.success ? (
                            <CheckCircle className="w-4 h-4" />
                        ) : (
                            <XCircle className="w-4 h-4" />
                        )}
                        <AlertTitle>
                            {testResult.success ? 'Conexión exitosa' : 'Error de conexión'}
                        </AlertTitle>
                        <AlertDescription>
                            {testResult.message}
                            {testResult.details && (
                                <p className="mt-1 text-sm">
                                    Servidor: {testResult.details.server}<br />
                                    Base de datos: {testResult.details.database}
                                </p>
                            )}
                            {testResult.suggestions && (
                                <ul className="mt-2 text-sm">
                                    {testResult.suggestions.map((s: string, i: number) => (
                                        <li key={i}>• {s}</li>
                                    ))}
                                </ul>
                            )}
                        </AlertDescription>
                    </Alert>
                )}
                </CardContent>
            )}
        </Card>
    );
}
