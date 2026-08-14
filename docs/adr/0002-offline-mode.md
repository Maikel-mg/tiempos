# 0002 — Modo offline con caché selectiva de proyectos

La app debe funcionar 100% sin conexión a la BBDD de la empresa (VPN frágil desde casa), permitiendo registrar Entradas de Tiempo y crear Procesos con sincronización manual. Se decidió: caché local selectiva por proyectos marcados (no catálogo completo), Procesos Pendientes con ID provisional y remapeo al sincronizar, y sincronización siempre manual con panel de confirmación bidireccional.

## Contexto

- El usuario trabaja desde casa con VPN que se cae continuamente. Sin VPN, el selector de procesos falla y no puede asignar procesos ni registrar entradas → no usa la app.
- La captura de Entradas de Tiempo ya es offline-first (IndexedDB/Dexie). Lo que falla es la lista de tareas/proyectos: `useProcessCache` hace fetch a `/api/processes` en cada montaje y no persiste.
- LiveTimeEntriesPage y el flujo de Clockify son legacy: la app migró a su propio registro local porque Clockify no permitía sincronizar las entradas con la BBDD.
- La BBDD vive detrás de la VPN: la ejecución (INSERT) es físicamente imposible sin VPN; solo la preparación puede ser offline.

## Decisiones

1. **Caché selectiva por Proyectos Offline**: el usuario marca proyectos en ProjectsPage (toggle por fila); solo esos tienen fases y tareas offline. Intento inmediato al marcar; si no hay conexión, quedan "pendientes de sincronizar". No se cachea el catálogo completo.
2. **Proceso Pendiente**: crear un proceso offline crea un registro local con ID provisional que aparece en el selector. Al sincronizar, se crea vía `spNETTiempos_Procesos_Mantenimiento`, se obtiene el NProceso oficial y se **remapean** automáticamente las Entradas de Tiempo que lo referencian. La sincronización de entradas SIEMPRE es manual.
3. **Sync de Procesos manual con panel bidireccional**: botón "Sincronizar procesos" que muestra pull (procesos nuevos del sistema, preseleccionados, deseleccionables masivamente), push (Procesos Pendientes) y duplicados por nombre con decisión "usar existente / crear nuevo". Progreso por etapas, fallo parcial con reintento quirúrgico.
4. **Sync de Entradas solo-create**: `spNETTiempos_Alta` solo inserta; las entradas sincronizadas no se modifican. La edición de entradas sincronizadas y un eventual UPDATE quedan fuera del alcance actual.
5. **Integridad**: entradas con Proceso Pendiente bloqueadas de sincronizar; desmarcar un proyecto bloqueado si tiene entradas pendientes; el caché es espejo del sistema (se reemplaza al sincronizar) pero las entradas nunca se borran ni reasignan sin acción del usuario; caché y pendientes por usuario (usured).
6. **Estado de conexión**: polling de `test-connection` (no `navigator.onLine`, que solo detecta internet), intervalo configurable en Settings (1–30 min, default 5), solo con pestaña visible.
7. **Indicador global** en el sidebar: pendientes + última actualización + estado de conexión; umbral de frescura del caché configurable (1–30 días, default 7) que solo avisa, nunca bloquea.
8. **Primera experiencia**: estado vacío con guía + sugerencia puntual de marcar proyectos (nunca auto-marcar).

## Alternativas consideradas y rechazadas

- **Catálogo completo offline** (todo el árbol de proyectos/fases): rechazado por volumen — decenas de proyectos, cientos de fases; el usuario solo usa unos pocos.
- **Sync automático / polling de datos**: rechazado — el usuario audita manualmente sus tiempos; auto-sync pierde control.
- **Creación de proceso diferida (opción B)**: seguir trackeando contra Proceso Genérico y crear al reconectar — rechazado, no es "crear offline".
- **Cola sin remapeo**: crear al reconectar pero reasignar entradas manualmente — rechazado, peor que el remapeo automático.
- **`navigator.onLine` para detectar conexión**: rechazado — internet ≠ VPN/BBDD.
- **Auto-marcar proyectos la primera vez**: rechazado — contradice la caché selectiva.

## Consecuencias

- El caché de procesos (ProcessCacheRepository) hoy es código muerto en producción y se debe cablear: `useProcessCache` debe persistir y servirse desde IndexedDB, y las tres fuentes (`/api/processes`, `/api/projects`, `/api/projects-tree`) deben unificarse en un refresh.
- El tipo `Proceso` no tiene campos de estado: hay que añadir `pending`/sync para Procesos Pendientes y un timestamp de última actualización.
- `syncError` nunca se persiste hoy: queda fuera del alcance (sync manual con reintento), pero el panel de sync debe reportar fallos por proceso.
- El formulario de creación (SQLPreviewModal) depende de SinFasesSelector (proyectos + fases del tree): para crear Procesos Pendientes offline, el caché de Proyectos Offline debe incluir fases.
