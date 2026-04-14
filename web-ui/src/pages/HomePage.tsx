import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Clock, ArrowRight, LayoutDashboard } from 'lucide-react';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function HomePage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="border-b bg-card">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <FileSpreadsheet className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Importador de Tiempos</h1>
                            <p className="text-sm text-muted-foreground">
                                CSV a SQL Server
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold tracking-tight mb-4">
                            ¿Qué deseas hacer hoy?
                        </h2>
                        <p className="text-muted-foreground text-lg">
                            Selecciona una opción para continuar
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer group border-2 border-transparent hover:border-primary">
                            <CardHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <LayoutDashboard className="w-6 h-6 text-purple-600 dark:text-purple-400" />

                                    </div>
                                    <CardTitle>Dashboard</CardTitle>
                                </div>
                                <CardDescription>
                                    Información sobre tus tiempos por periodos
                                </CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <Button 
                                    className="w-full group-hover:bg-primary/90 transition-colors"
                                    onClick={() => navigate('/dashboard')}
                                >
                                    Ver estadísticas
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                       
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer group border-2 border-transparent hover:border-primary">
                            <CardHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                                        <FileSpreadsheet className="w-6 h-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <CardTitle>Importar CSV</CardTitle>
                                </div>
                                <CardDescription>
                                    Sube un archivo CSV y genera sentencias SQL para importar tiempos a SQL Server
                                </CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <Button 
                                    className="w-full group-hover:bg-primary/90 transition-colors"
                                    onClick={() => navigate('/import')}
                                >
                                    Comenzar Importación
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>

                        <Card className="hover:shadow-lg transition-shadow cursor-pointer group border-2 border-transparent hover:border-primary">
                            <CardHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                        <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <CardTitle>Ver Tiempos en Vivo</CardTitle>
                                </div>
                                <CardDescription>
                                    Visualiza las entradas de tiempo registradas en Clockify en tiempo real
                                </CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <Button 
                                    variant="outline" 
                                    className="w-full group-hover:bg-accent transition-colors"
                                    onClick={() => navigate('/live-entries')}
                                >
                                    Ver Entradas
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>

                        <Card className="hover:shadow-lg transition-shadow cursor-pointer group border-2 border-transparent hover:border-primary">
                            <CardHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                                        <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <CardTitle>Mi TimeTracker</CardTitle>
                                </div>
                                <CardDescription>
                                    Registra tu tiempo con temporizador o entrada manual y sincroniza con la BBDD
                                </CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <Button 
                                    className="w-full group-hover:bg-primary/90 transition-colors"
                                    onClick={() => navigate('/time-tracker')}
                                >
                                    Abrir TimeTracker
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </main>

            <footer className="border-t mt-auto">
                <div className="container mx-auto px-4 py-4">
                    <p className="text-center text-sm text-muted-foreground">
                        Selecciona una opción para comenzar
                    </p>
                </div>
            </footer>
        </div>
    );
}
