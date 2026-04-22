export function HomePage() {
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
            <div className="max-w-2xl mx-auto px-4 py-12 text-center">
                <div className="mb-8">
                    <div className="p-4 bg-primary/10 rounded-lg inline-block mb-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-primary"
                        >
                            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                            <line x1="16" x2="16" y1="2" y2="6" />
                            <line x1="8" x2="8" y1="2" y2="6" />
                            <line x1="3" x2="21" y1="10" y2="10" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">
                        Bienvenido al Importador de Tiempos
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Gestiona tus registros de tiempo e impórtalos a SQL Server
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 max-w-xl mx-auto text-left">
                    <div className="rounded-lg border p-4">
                        <h3 className="font-semibold mb-1">Navegación</h3>
                        <p className="text-sm text-muted-foreground">
                            Usa el menú lateral para acceder a las diferentes secciones de la aplicación.
                        </p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <h3 className="font-semibold mb-1">Importación</h3>
                        <p className="text-sm text-muted-foreground">
                            Sube archivos CSV y genera sentencias SQL listas para ejecutar.
                        </p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <h3 className="font-semibold mb-1">Seguimiento</h3>
                        <p className="text-sm text-muted-foreground">
                            Visualiza entradas en vivo desde Clockify o usa el temporizador interno.
                        </p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <h3 className="font-semibold mb-1">Validación</h3>
                        <p className="text-sm text-muted-foreground">
                            Detecta duplicados y evita conflictos en la base de datos.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
