# Web UI - Importador de Tiempos

Interfaz web para registrar tiempos y generar/ejecutar SQL en SQL Server. Combina un temporizador interno y un dashboard. Necesita el backend Express para las operaciones contra la base de datos.

## Características

- Temporizador interno y registro manual de tiempos, con persistencia local en IndexedDB.
- Asignación visual de IDs de proceso/tarea.
- Generación, vista previa y ejecución de SQL contra SQL Server.
- Sincronización de registros de tiempo con la base de datos.
- Dashboard con resumen de horas y desglose por tarea.
- Propuestas de tarea a partir de procesos genéricos.
- Tema claro/oscuro, notificaciones (toast) y diseño responsive con TailwindCSS.

## Stack

| Paquete | Uso |
|---------|-----|
| React 18 + TypeScript | Framework UI |
| Vite | Bundler / Dev server |
| TailwindCSS + shadcn/ui | Estilos y componentes |
| TanStack Query v5 | Estado de datos (caché, loading, error) |
| React Router v7 | Navegación |
| Axios | Cliente HTTP centralizado (`ApiClient`) |
| Dexie | Persistencia local en IndexedDB |
| Vitest + Testing Library | Testing |
| Sonner | Notificaciones toast |

## Estructura del proyecto

```
web-ui/
├── src/
│   ├── components/
│   │   ├── ui/                    # Componentes shadcn/ui
│   │   └── ...                    # Componentes compartidos (AppLayout, DBConnection, ...)
│   ├── config/                    # Stores de configuración (ConfigStore)
│   ├── features/                  # Features organizadas por dominio
│   │   ├── time-tracker/          # Temporizador y registros locales
│   │   ├── dashboard/             # Métricas y gráficos
│   │   ├── process-management/    # Procesos/tareas
│   │   ├── projects/              # Proyectos
│   │   ├── proposal-ui/           # Propuestas de tarea
│   │   ├── db-connection/         # Test de conexión a base de datos
│   │   └── sync-validator/        # Validación de sincronización
│   ├── lib/
│   │   ├── api/client.ts          # ApiClient centralizado (axios)
│   │   ├── storage/               # IndexedDB (Dexie)
│   │   └── ...                    # Utilidades (sql-generator, task-mapping-storage, ...)
│   ├── pages/                     # Páginas (composición de features)
│   └── styles/                    # CSS global y variables Tailwind
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Requisitos

- Node.js 18+
- Backend en `http://localhost:3001` (ver `npm run dev-backend` en la raíz del repo)

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Build para producción

```bash
npm run build
```

Los archivos generados estarán en la carpeta `dist/`.

## Uso

1. **Configuración (`/settings`)**: introduce los datos de conexión a SQL Server (servidor, base de datos, usuario, contraseña) y las preferencias de usuario.
2. **TimeTracker (`/time-tracker`)**: registra tiempos con el temporizador o de forma manual. Los registros se guardan en el navegador hasta que se sincronizan.
3. **Dashboard (`/dashboard`)**: revisa las horas registradas y el desglose por tarea.
4. **Proyectos (`/projects`) y Mis Tareas (`/my-tasks`)**: consulta proyectos y procesos disponibles desde la base de datos.

## Configuración

La conexión a SQL Server y las preferencias se guardan en el navegador mediante el ConfigStore y se editan en la página `/settings`. El backend solo necesita `PORT` en el archivo `.env`.

## Tests

```bash
npm run test:run     # ejecuta Vitest una vez
npm run type-check   # comprueba tipos con TypeScript
```
