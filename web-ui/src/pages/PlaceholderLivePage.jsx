import { useNavigate } from 'react-router-dom';
import { Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PlaceholderLivePage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="border-b bg-card">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => navigate('/')}
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Volver
                        </Button>
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Ver Tiempos en Vivo</h1>
                            <p className="text-sm text-muted-foreground">
                                Visualización de Clockify
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="p-8 bg-muted rounded-lg">
                        <h2 className="text-2xl font-bold mb-4">Página en Construcción</h2>
                        <p className="text-muted-foreground mb-6">
                            Esta funcionalidad se implementará en el próximo cambio.
                        </p>
                        <Button onClick={() => navigate('/')}>
                            Volver al Inicio
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
