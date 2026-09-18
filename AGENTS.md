# AGENTS.md - Contexto del Proyecto

## Qué es

Importador de tiempos: herramienta con temporizador interno para registrar tiempos que permite generar/insertar datos en **SQL Server** mediante una interfaz web.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express + TypeScript |
| Frontend | React 18 + Vite + TailwindCSS |
| Base de datos | SQL Server (vía `mssql`) |
| Config | `.env` con `PORT`; conexión SQL configurada en el cliente (ConfigStore) |

## Estructura

```
server.ts          Backend Express (endpoints: /api/test-connection, /api/execute-sql, /api/projects, /api/processes, /api/sync-time-entries, /api/execute-time-entries)
src/
  domain/models/   Modelos de dominio (vacío actualmente)
  application/     Lógica de aplicación (vacío actualmente)
web-ui/            Frontend React (temporizador interno, dashboard, proyectos, sincronización con SQL Server)
  src/components/  Componentes UI
  src/hooks/       Custom hooks
  src/lib/         Utilidades
  src/pages/       Páginas
  src/styles/      Estilos
  src/features/    Features organizadas por dominio (time-tracker, dashboard, projects, process-management)
  src/lib/api/     ApiClient centralizado (axios wrapper)
```

## Comandos

- `npm run web` - Levanta frontend (Vite dev server, puerto 5173)
- `npm run dev-backend` - Levanta backend con recarga automática (tsx watch)
- `npm run start` - Ejecuta backend compilado (puerto 3001)
- `npm run build:backend` - Compila TypeScript del backend a `dist/`

## Flujo principal

1. Usuario registra tiempos con el temporizador interno o de forma manual
2. Los registros se guardan localmente en el navegador (IndexedDB)
3. Usuario sincroniza los registros con SQL Server
4. Backend ejecuta las inserciones directamente contra la BD
5. Dashboard y páginas de proyectos consultan los datos de la BD

## Convenciones

- TypeScript estricto (`strict: true`)
- Backend usa `tsx` para desarrollo, compila a `dist/` para producción
- **Ver [WEB_ARCHITECTURE.md](./WEB_ARCHITECTURE.md) para estándares de desarrollo frontend

### SQL Server — Fechas y lenguaje de sesión (CRÍTICO)

Cuando se ejecuta SQL desde el backend (driver `mssql`/`tedious`), las sesiones de SQL Server arrancan con idioma `us_english` (MDY), mientras que SSMS hereda el idioma del login (`Spanish` = DMY). Esto hace que las conversiones implícitas `varchar → datetime` fallen con "out-of-range value" aunque el mismo SQL funcione perfectamente en SSMS.

**Regla:** Todo SQL batch que ejecute stored procedures con parámetros de fecha DEBE comenzar con:

```sql
SET LANGUAGE Spanish;
SET DATEFORMAT dmy;
```

**NO confiar en `language: 'Spanish'` en la configuración de conexión del driver** — esa opción solo afecta cómo el driver parsea los resultados que vienen del servidor, **NO** ejecuta `SET LANGUAGE Spanish` en la sesión de SQL Server.

**Formato de fechas:** Usar `YYYYMMDD` (sin separadores) para parámetros datetime. Es inambiguoso en cualquier idioma una vez que la sesión tiene `SET LANGUAGE Spanish`.

**Archivos afectados:**
- `server.ts` — configuraciones de conexión (se mantiene `language: 'Spanish'` por claridad, pero no es suficiente)
- `web-ui/src/lib/sql-generator/index.ts` — todo SQL generado debe incluir `SET LANGUAGE Spanish;`

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses default label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — `CONTEXT.md` and `docs/adr/` at repo root. See `docs/agents/domain.md`.
