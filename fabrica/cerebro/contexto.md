# Contexto

## El proyecto

`importador-tiempos`: registro de tiempos con temporizador interno, persistido en IndexedDB, que sincroniza con SQL Server vía stored procedures. Backend Node + Express + TypeScript; frontend React 18 + Vite + TailwindCSS + shadcn; SQL Server por `mssql`.

Raíz del proyecto: **`C:\Personal\importador-tiempos`**. La fábrica vive en `C:\Personal\importador-tiempos\fabrica`. Trabaja siempre con rutas absolutas.

## Lo fijo: dónde leer

No copies estos documentos; léelos.

| Qué necesitas | Dónde |
|---|---|
| Estructura del repo, comandos, la trampa de fechas en SQL Server | `AGENTS.md` (raíz) |
| Vocabulario del dominio y los términos prohibidos | `CONTEXT.md` |
| Estándares de frontend | `WEB_ARCHITECTURE.md` |
| Ir de un concepto («timer», «split», «balance») al fichero | `docs/MAP.md` |
| Decisiones de arquitectura ya tomadas | `docs/adr/` |
| Qué se espera del cuerpo de una PR | `.github/pull_request_template.md` |
| Cómo se gestionan los issues | `docs/agents/issue-tracker.md` |

Si el issue toca algo que tiene ADR, el ADR manda sobre tu criterio.

## Cómo se comprueba

```bash
# backend (raíz del repo)
npm run lint && npm run build:backend && npm test

# frontend
cd web-ui && npm run lint && npm run type-check && npm run test:run
```

Vitest en ambos paquetes. Los tests del backend viven en `__tests__/` y junto al código; los del frontend, en `__tests__/` dentro de cada feature.

## Convenciones que se rompen solas si no las miras

- **TypeScript estricto.** Sin `any` nuevo sin motivo escrito.
- **SQL Server:** todo batch que llame a un stored procedure con fechas empieza por `SET LANGUAGE Spanish; SET DATEFORMAT dmy;`, y las fechas van como `YYYYMMDD`. Esto ya está resuelto en `sp-builder.ts`; si el cambio no lo toca, no lo toques.
- **Git:** ramas `factory/<issue>-<slug>` y commits convencionales con el número del issue: `feat(#128): …`, `fix(#129): …`, `test(...)`, `refactor(...)`.
- **Base de la rama:** `develop`. Nunca `main`.
- **Componentes presentacionales:** 150 líneas es la señal de tu estándar. Se parte cuando hay un sub-seam real (responsabilidad propia + tests propios), no para cumplir un conteo.

## Lo que cambia

Nada requiere un paso de sincronización: la fábrica lee estos documentos en cada ejecución y siempre están frescos. Si algún día `docs/MAP.md` deja de cubrir el código, se arregla `MAP.md`, no se añade un paso.
