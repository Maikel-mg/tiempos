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
server.ts          Backend Express. Endpoints: ver `server.ts` (fuente de verdad)
src/
  application/     Lógica de aplicación: sp-builder, entry-classifier, sql-executor
  domain/          Dominio puro: date-parser, db-config, tree-transformer, year-month-pairs
  shared/          Utilidades compartidas: date-helpers
web-ui/            Frontend React (temporizador interno, dashboard, proyectos, sincronización SQL)
  src/features/    Features por dominio: time-tracker, dashboard, projects, process-management,
                   proposal-ui, db-connection, sync-validator
  src/pages/       Páginas de composición: Home, Settings, Projects, ProjectDetail
  src/components/  UI: components/ui (shadcn) y components/shared (compartidos)
  src/hooks/       Hooks transversales (timer, atajos de teclado, tema)
  src/lib/         Utilidades: api/ (ApiClient), storage/, config-storage/, keyboard/, format, notifications
  src/domain/      Dominio del frontend: proposals/
  src/config/      Stores de configuración
```

**Para ir de un concepto (timer, split, balance, atajos, sync...) al archivo concreto, ver [`docs/MAP.md`](./docs/MAP.md).**

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
- **Ver [WEB_ARCHITECTURE.md](./WEB_ARCHITECTURE.md) para estándares de desarrollo frontend**

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
- `src/application/sp-builder.ts` — todo SQL generado debe incluir `SET LANGUAGE Spanish;`
- `src/application/sql-executor.ts` — ejecución de los batches contra SQL Server

## Documentación

| Documento | Contenido |
|-----------|-----------|
| `docs/MAP.md` | Índice concepto → archivo para navegar el código |
| `CONTEXT.md` | Glosario de dominio: términos canónicos y los que hay que evitar |
| `WEB_ARCHITECTURE.md` | Estándares de frontend: estructura, ApiClient, React Query, errores |
| `docs/adr/` | Decisiones de arquitectura (ADR numerados) |
| `docs/PRD-TimeTracking.md` | Requisitos del sistema de registro de tiempos |
| `docs/prd/` | PRDs de features concretas |
| `docs/TECH-DESIGN-TimeTracker.md` | Diseño técnico del tracker (abr 2026) |
| `DESIGN.md` | Tokens y sistema visual (Linear). No es arquitectura |
| `plans/` | Planes de implementación (skill improve) |
| `openspec/changes/` | Cambios del flujo SDD/OpenSpec (archivados) |

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses default label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — `CONTEXT.md` and `docs/adr/` at repo root. See `docs/agents/domain.md`.
