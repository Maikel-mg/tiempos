# Importador de Tiempos

Aplicación para obtener registros de tiempo desde Clockify y generar/ejecutar SQL en SQL Server.

## Language

**Configuración (Settings)**:
Página dedicada (`/settings`) para editar la configuración de la aplicación (conexión DB, preferencias de usuario). No es inline en los wizards.
_Avoid_: Config page, Preferences, Ajustes

**Info Bar**:
Componente de solo lectura que muestra la configuración activa (usuario, tipoHora, fase) en la parte superior de las páginas. Enlaza a Settings para editar.
_Avoid_: Config summary, Config display

**Guard Pattern**:
Bloqueo de acciones que requieren configuración (ej: "Ejecutar en BD") cuando la config falta, con redirección a Settings. No bloquea la carga de la página.
_Avoid_: Config check, Validation gate

**dbConfig**:
Store de configuración de conexión a SQL Server (server, database, username, password encriptado). Se edita en Settings.
_Avoid_: DB settings, Database config

**wizardConfig**:
Store de preferencias de importación (usuario, fase, tipoHora). Se edita en Settings. La fase tiene comportamiento contextual por mes.
_Avoid_: Import config, User preferences

**phaseByMonthConfig**:
Store interno que cachea las fases sugeridas por mes. Se actualiza automáticamente al aplicar sugerencias. No tiene UI.
_Avoid_: Phase cache, Month phases

**Fase (contextual)**:
ID de fase que varía por mes. En Settings se muestra la actual. En LiveTimeEntriesPage muestra hint con sugerencia mensual y botón "Aplicar".
_Avoid_: Phase ID, Fase ID

**Tipo de Hora**:
Numeral que identifica el tipo de hora a registrar (default: 11). Se edita en Settings, se muestra read-only en info bar.
_Avoid_: Hour type, Time type

**Tarea (Proceso)**:
Entidad que se crea vía `spNETTiempos_Procesos_Mantenimiento`. Tiene un nombre (descripción), fechas previstas, minutos estimados, y una fase. El SQLPreviewModal permite crearlas desde el ProcessSelector (modo creación sin datos pre-cargados) o desde el ProcessMappingTable (modo edición con datos extraídos de la fila).
_Avoid_: Task, Process (cuando el contexto es el dominio de la app)

**SpBuilder**:
Módulo que construye strings SQL para stored procedures con escape de parámetros y formato de fechas. Funciones puras, sin I/O.
_Avoid_: SQL generator, Query builder

**EntryClassifier**:
Módulo que compara entradas de tiempo entrantes contra filas de BD y clasifica cada una como `alreadyExists` o `willInsert`. Función pura.
_Avoid_: Validator, Checker

**ClockifyApp**:
Capa de aplicación que envuelve `ClockifyApiClient` con operaciones de nivel de negocio (obtener workspaces, entradas, reportes, crear tareas, etc.).
_Avoid_: ClockifyService

**Proceso Genérico**:
Tarea de propósito amplio (General, Errores) contra la que se trackea tiempo cuando no hay una Tarea específica creada. Se crea uno nuevo por mes con nombre `IPKWEB AAAA-MM. General` o `IPKWEB AAAA-MM. Errores`. El tiempo acumulado contra un proceso genérico con una misma descripción repetida es candidato a generar una Propuesta de Tarea.
_Avoid_: Default task, Catch-all task, Tarea por defecto

**Propuesta de Tarea**:
Sugerencia de crear una Tarea dedicada a partir de tiempo acumulado contra un Proceso Genérico, agrupando entradas locales por descripción repetida. Cuando el total supera un umbral de horas, el sistema propone un nombre y permite crear la Tarea.
_Avoid_: Task suggestion, Auto-create task, Sugerencia automática

**Entrada de Tiempo**:
Asignación de horas trabajadas a una Tarea/Proyecto. Es el término único y canónico: el hecho de estar sincronizada o no con la BBDD es un **estado** de la entrada de tiempo (`synced: boolean`), no un concepto distinto. El flujo principal de entrada de tiempo es el local (TimeTrackingPage, timer + entrada manual, siempre offline-first). El flujo de importación desde Clockify (LiveTimeEntriesPage) es **legacy** y ya no se usa: la app migró de Clockify a su propio registro local porque Clockify no permitía sincronizar las entradas de tiempo con la BBDD.
_Avoid_: Imputación, Time entry, Registro de tiempo (como concepto separado del estado de sync)

**Proceso Pendiente**:
Proceso creado offline desde la app con un ID provisional. Aparece en el selector de procesos y se le pueden asignar Entradas de Tiempo. Al sincronizar (cuando hay conexión), la app crea el proceso real en la BBDD vía `spNETTiempos_Procesos_Mantenimiento`, obtiene el NProceso oficial y **remapea** automáticamente las Entradas de Tiempo que lo referenciaban. No se sincronizan entradas automáticamente: el sync de Entradas de Tiempo es siempre manual.
_Avoid_: Proceso borrador, Proceso local, Draft process

**Remapeo**:
Operación interna que reasigna el NProceso oficial (devuelto por la BBDD al crear un Proceso Pendiente) a las Entradas de Tiempo locales que usaban el ID provisional. No es una sincronización de datos visible al usuario.
_Avoid_: Reasignación, Migración de referencias

**Proyecto Offline**:
Proyecto marcado por el usuario como disponible sin conexión (toggle en ProjectsPage). Al marcarlo, la app cachea sus fases y tareas (procesos) cuando hay conexión; si no la hay, queda marcado como pendiente de sincronizar y se completa en el próximo sync manual. El caché es selectivo: solo los proyectos marcados tienen fases y tareas offline.
_Avoid_: Proyecto favorito, Proyecto cacheado, Offline project

**Sync de Procesos**:
Operación manual (botón) que sincroniza Procesos Pendientes y caché de Proyectos Offline con la BBDD. Abre un panel con el estado real de la BBDD: procesos nuevos del sistema (pull, preseleccionados, deseleccionables en bloque), procesos pendientes locales (push), y posibles duplicidades a decidir. Se aplica por etapas con progreso parcial y reintento de lo fallido.
_Avoid_: Sync de entradas, Sincronización automática

**Sincronización de Entradas de Tiempo**:
Operación manual (por fila o en bloque desde SyncPanel) que envía Entradas de Tiempo locales a la BBDD vía `spNETTiempos_Alta`. Siempre la inicia el usuario; nunca automática. Las entradas asignadas a un Proceso Pendiente no se pueden sincronizar hasta que el proceso exista en la BBDD.
_Avoid_: Imputar, Push de entradas, Auto-sync

**Desmarcado de Proyecto Offline**:
Acción de quitar un proyecto de la disponibilidad offline. Bloqueada si el proyecto tiene Entradas de Tiempo pendientes de sincronización asignadas a sus procesos (sean Procesos Pendientes o procesos normales). Si solo tiene Procesos Pendientes sin entradas vinculadas (huérfanos), se eliminan al desmarcar sin riesgo. Si no tiene nada pendiente, limpia el caché del proyecto directamente.
_Avoid_: Quitar offline, Desfavoritear

**Frescura del Caché**:
Umbral configurable en Settings (1–30 días, default 7) que determina cuándo el indicador global avisa que las tareas/procesos offline están desactualizados ("Tus tareas tienen X días — conecta para refrescar"). Solo avisa, nunca bloquea. El tope de un mes es coherente con la fase contextual por mes.
_Avoid_: TTL, Expiración, Cache staleness

**Propuesta de Tarea (offline)**:
Aceptar una propuesta de Tarea (tiempo acumulado contra un Proceso Genérico que supera el umbral) abre el flujo de creación de Proceso Pendiente: elegir proyecto + fase de los Proyectos Offline, nombre sugerido, minutos. Las entradas del grupo se reasignan al Pendiente y se crea en la BBDD al sincronizar. Funciona idéntico online y offline.
_Avoid_: Task suggestion offline, Aceptar propuesta online-only

**Estado de Conexión**:
Estado "Conectado a BBDD" / "Sin conexión a BBDD" calculado por polling de `test-connection` al backend. Intervalo configurable en Settings (1–30 min, default 5), solo cuando la pestaña está visible (se pausa en segundo plano). No usa `navigator.onLine` porque eso solo detecta internet, no la VPN/BBDD.
_Avoid_: Online/offline browser, Connectivity check

**Caché por Usuario**:
Los Proyectos Offline y los Procesos Pendientes están ligados al usuario (usured) que los creó. Al cambiar de usuario en Settings, la app avisa y no muestra el caché ni los pendientes del usuario anterior (se conservan hasta volver). Evita mezclar datos de personas distintas en la misma máquina.
_Avoid_: Caché global, Caché de máquina

**Sincronización de Procesos (solo-create)**:
La Sincronización de Entradas de Tiempo es únicamente de creación (INSERT vía `spNETTiempos_Alta`). No actualiza entradas ya sincronizadas: una vez en la BBDD, la entrada no se modifica desde la app (la edición de entradas sincronizadas y un eventual UPDATE quedan fuera del alcance actual).
_Avoid_: Upsert, Sync bidireccional de entradas
