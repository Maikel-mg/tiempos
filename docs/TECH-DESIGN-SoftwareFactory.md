# Diseño Técnico - Software Factory (local)

> Estado: **diseño cerrado, nada implementado**. Decisiones tomadas en sesión de grilling
> (oct 2026). Este documento fija el contrato; el runner se implementa después.

## 0. Cómo se usa

```bash
npm run factory -- run 124 --radio "web-ui/src/features/time-tracker/lib/**,web-ui/src/features/time-tracker/types/**"
```

Eso hace tres cosas sin ti: crea un **worktree aislado** con un brief sacado de la issue,
lanza una **sesión de agente limpia** dentro de él (no arrastra esta conversación: el brief
es todo su contexto), y abre el **PR** con la descripción del DoD ya rellenada. Si el cambio
se sale del radio, no hay PR: te dice qué ficheros se salieron.

Tus tres decisiones, y ninguna más:

1. **Qué issue** y con qué radio (`--radio`).
2. **Mergear el PR o no.** Nadie mergea por ti.
3. Las issues marcadas **parcial** en la auditoría: leer y decidir si reescribir o cerrar.

Otros comandos:

| Comando | Para qué |
|---|---|
| `npm run factory -- check 124` | verifica el radio de un worktree sin lanzar nada |
| `npm run factory -- prepare 124 --radio ...` | solo el brief + worktree, sin agente |
| `npm run factory -- finish 124` | commit + push + PR del worktree existente |
| `npm run factory -- selftest` | comprueba el verificador de radio |

Los briefs viven en `.factory/briefs/<issue>.md` (no versionados). El del PR es
`<issue>.pr.md`, que puede escribirlo el agente o tú.

## 1. Qué es y qué no es

Una fábrica **local** que convierte una issue de GitHub en un PR mergeable sin que el
desarrollador condúzcalo sesión a sesión. Vive en esta máquina y usa lo que ya existe:
`gh`, `npm test`, `scripts/dev.ps1`, el CI de `.github/workflows/ci.yml`.

No es un producto externo (no salen de aquí el repo ni las credenciales de la BD), no es
GitHub Actions con API key en secrets, y **no decide qué construir**.

## 2. Punto de partida real (medido)

| Hecho | Dato |
|---|---|
| Issues `ready-for-agent` abiertas | 33 |
| De ellas, tocan SQL/BD | ~7 (#63, #64, #65, #66, #95, #120, #121) |
| De ellas, ya implementadas en `develop` | **17** (ver `docs/AUDITORIA-Backlog.md`) |
| Cola real (pendiente + parcial) | ~14 |
| Trabajo hecho y no mergeado en `feature/CacheoDeProyectos` | 7 commits, 8.280 líneas, 70 ficheros (T4-T7) |
| Cobertura real de SQL Server en CI | **ninguna** (`vi.mock('mssql')`) |
| Feature flags en el repo | ninguno |

Conclusión que motiva el diseño: **el backlog miente en ambos sentidos**. `ready-for-agent`
no significa "pendiente", y una auditoría que solo mire `develop` no ve 8.000 líneas ya
pagadas.

## 3. Las cuatro piezas

### 3.1 Gate SQL — **punto de arranque** (lo primero que se implementa)

El CI nunca habla con SQL Server: `sp-builder.test.ts` comprueba substrings sueltos y
`__tests__/sync-time-entries.test.ts` mockea `mssql`. El path de **escritura** es por tanto
el único sitio del repo con riesgo irreversible, y es donde se empieza.

1. **Snapshots del batch completo** (`toMatchSnapshot`) para los batches de escritura:
   `buildExecuteTimeEntriesSQL` y el de sync. Cualquier cambio en fechas, orden de
   parámetros, comillas o `NULL` aparece como diff en el PR. Lecturas (`Proyectos`, `Tree`,
   `Procesos`) no: generan ruido por filtros opcionales.
2. **Smoke de solo lectura** pre-merge contra la BD real (Proyectos, Tree, Procesos) con
   checklist en el PR. No se replican los SP `spNET*` en docker: divergiría del servidor
   real justo en los casos que duelen.

Regla heredada de `AGENTS.md` que estos tests protegen: todo batch arranca con
`SET LANGUAGE Spanish; SET DATEFORMAT dmy;`.

### 3.2 Triage → brief + auditoría de existencias

Salida del triage, por issue: veredicto de **cinco estados** y un *brief*.

| Estado | Significado | Acción |
|---|---|---|
| hecho | ya está en `develop` | cierre con evidencia (`ruta:línea` + commit) |
| hecho-en-rama | existe en una rama | cierre o rescate, nunca reconstruir |
| parcial | parte está | issue reescrita con "falta X", **no se cierra** |
| ausente | no está | brief listo para el runner |
| descartada | decisión de producto | label `wontfix` + razón + cierre |

La auditoría mira **todas las ramas** (`git log --all`). Los cierres y las reescrituras se
aprueban **en lote** (una revisión de texto, ~30 s por issue), no una por una. Las issues
que toquen modelo de datos o permisos se marcan como dudosas por defecto: el agente no huele
intención de producto.

*Brief* = ficheros/dirs esperados, tests existentes que sirven de patrón, comandos, y el
radio de impacto (§3.3). La sesión lo verifica contra el repo antes de escribir nada.

### 3.3 Radio de impacto y ficheros protegidos

El tamaño no mide peligro: un tope de 400 líneas habría bloqueado 4 de los 7 últimos
commits (refactors, 200-800 líneas) y no habría bloqueado 20 líneas en `sp-builder`.

- **Radio declarado** en el brief. El runner no escribe fuera de ahí; si lo necesita, para y
  devuelve "esto es más grande de lo que decía la issue". Aviso blando (no bloqueo) a partir
  de ~8 ficheros o 3 áreas.
- **Protegidos** (sin autonomía post-hoc, revisión pre-merge siempre): `sp-builder.ts`,
  `sql-executor.ts`, esquema/persistencia de IndexedDB, `ConfigStore`, y todo lo que escriba
  en SQL.
- **Cambio observable**: campo obligatorio en el PR — "sí/no, y cómo lo veo en 2 minutos".
  Si dice "sí" o toca un fichero protegido, el merge es del humano.

### 3.4 Definición de "hecho" y "listo" (separadas)

**Hecho** = el código existe (con o sin tests). Cierra issue con evidencia.
**Listo** = cumple el DoD y puede mergearse sin leer el diff:

1. `lint` + `type-check` + `test` verdes en ambos paquetes (CI).
2. Test que cubre la lógica nueva (rama, bucle, parser; no trivial).
3. `.snap` intacto o actualizado con una línea de por qué.
4. Cuerpo del PR: issue, qué cambió, **qué no se hizo**, cambio observable, cómo verificarlo
   en 2 min.

Mezclarlas haría firmar como "verificado" 8.000 líneas heredadas sin tests.

## 4. Operación

| Aspecto | Decisión |
|---|---|
| Dónde corre | local, sin infra nueva |
| Ratio de merge | uno por **issue** (no por PR): "decides qué aterriza", no "revisas seis diffs" |
| Concurrencia | serial dentro de una zona, paralelo entre zonas (backend/SQL ↔ web-ui) |
| Al agotar presupuesto | PR en borrador + nota de estado; **sin reintentos automáticos** |
| Tras el merge | revisión post-hoc en web-ui; pre-merge en protegidos |
| Red final | `develop` → `main` cuando tú ya has usado la app; etiqueta `verificado-en-local` |
| Medida de éxito | commits tuyos por cambio (tu tiempo), no issues/semana |

## 5. La fábrica nunca

- Decide **qué** construir, ni reabre una idea con `wontfix`.
- Abandona una issue por su cuenta: devuelve "no sale" + razón.
- Mergea `main` ni toca la BD real por su cuenta.
- Escribe fuera del radio declarado.
- Se cree `ready-for-agent` sin auditar.

## 6. Orden de arranque

0. **Saneamiento** (solo lectura + `gh`): auditoría a 5 estados de las 33 issues sobre todas
   las ramas; tag `archive/offline-mode` sobre `feature/CacheoDeProyectos`; rescate de T7
   apuntado en #121; `wontfix` en #114 y #120 con razón; lote de cierres aprobado.
1. **Gate SQL** (§3.1): snapshots del write path + checklist de smoke. Es lo primero porque
   es lo único con riesgo irreversible y es lo que compra la confianza para todo lo demás.
2. **Runner + piloto**: #112 `computeTaskHours` (función pura, criterios explícitos, cero
   riesgo, patrón de test ya existente). Después #124, y el primer SQL real sería #64, ya
   con snapshots puestos.
3. **Triage autónomo** con OK en lote (§3.2), para que la cola llegue preparada.

## 7. Riesgos abiertos
- `feature/CacheoDeProyectos` está 42 commits por detrás de `develop`, con un refactor de
  hooks por medio: es probable que no compile. El rescate de T7 se estima, no se asume.
- Sin feature flags, la única prueba de comportamiento real es tu uso de la app.
- La duración del CI y el estado de `main` vs `develop` no se han medido.
