# AGENTS.md - Contexto del Proyecto

## Qué es

Importador de tiempos: herramienta que obtiene registros de tiempo desde **Clockify** (API) y permite generar/insertar datos en **SQL Server** mediante una interfaz web.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express + TypeScript |
| Frontend | React 18 + Vite + TailwindCSS |
| Base de datos | SQL Server (vía `mssql`) |
| API externa | Clockify API (time entries + reports) |
| Config | `.env` con `CLOCKIFY_API_KEY`, `CLOCKIFY_WORKSPACE_ID`, `CLOCKIFY_USER_ID`, credenciales SQL |

## Estructura

```
server.ts          Backend Express (endpoints: /api/test-connection, /api/execute-sql, /api/clockify/report, /api/time-entries)
src/
  domain/models/   Modelos de dominio (vacío actualmente)
  application/     Lógica de aplicación (vacío actualmente)
web-ui/            Frontend React (wizard de 3 pasos: subir CSV, asignar IDs, generar SQL)
  src/components/  Componentes UI
  src/hooks/       Custom hooks
  src/lib/         Utilidades
  src/pages/       Páginas
  src/styles/      Estilos
  src/features/    Features organizadas por dominio (import-csv, live-entries)
  src/lib/api/     ApiClient centralizado (axios wrapper)
```

## Comandos

- `npm run web` - Levanta frontend (Vite dev server, puerto 5173)
- `npm run dev-backend` - Levanta backend con recarga automática (tsx watch)
- `npm run start` - Ejecuta backend compilado (puerto 3001)
- `npm run build:backend` - Compila TypeScript del backend a `dist/`

## Flujo principal

1. Usuario sube CSV exportado de app externa (o Clockify vía API)
2. Frontend parsea CSV, detecta separador (tab/coma)
3. Usuario asigna IDs de proceso a cada tarea
4. Se genera SQL con `INSERT` para ejecutar en SQL Server
5. Backend opcionalmente ejecuta el SQL directamente contra la BD

## Convenciones

- TypeScript estricto (`strict: true`)
- Backend usa `tsx` para desarrollo, compila a `dist/` para producción
- Frontend es standalone (no depende del backend para parsear CSV)
- Archivos de ejemplo en raíz: `ejemplo.csv`, `ejemplo_comas.csv`, `tiemposEnero.csv`
- **Ver [WEB_ARCHITECTURE.md](./WEB_ARCHITECTURE.md) para estándares de desarrollo frontend**
