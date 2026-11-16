# Importador de Tiempos

Aplicación para registrar tiempos con temporizador interno y generar/ejecutar SQL en SQL Server.

## Language

**Configuración (Settings)**:
Página dedicada (`/settings`) para editar la configuración de la aplicación (conexión DB, preferencias de usuario). No es inline en los formularios.
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
Store de preferencias de usuario (usuario, fase, tipoHora). Se edita en Settings.
_Avoid_: User preferences

**Fase**:
ID de fase asociado a los registros de tiempo. Se edita en Settings.
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

**Proceso Genérico**:
Tarea de propósito amplio (General, Errores) contra la que se trackea tiempo cuando no hay una Tarea específica creada. Se crea uno nuevo por mes con nombre `IPKWEB AAAA-MM. General` o `IPKWEB AAAA-MM. Errores`. El tiempo acumulado contra un proceso genérico con una misma descripción repetida es candidato a generar una Propuesta de Tarea.
_Avoid_: Default task, Catch-all task, Tarea por defecto

**Propuesta de Tarea**:
Sugerencia de crear una Tarea dedicada a partir de tiempo acumulado contra un Proceso Genérico, agrupando entradas locales por descripción repetida. Cuando el total supera un umbral de horas, el sistema propone un nombre y permite crear la Tarea.
_Avoid_: Task suggestion, Auto-create task, Sugerencia automática

**Registro de tiempo**:
Unidad de tiempo ya finalizada que pertenece a una Tarea (Proceso), tiene fecha, intervalo y descripción, y puede quedar pendiente o sincronizada con la base de datos.
_Avoid_: Timer, temporizador, sesión activa

**Timer activo**:
Medición de tiempo en curso para una Tarea, todavía no convertida en un Registro de tiempo finalizado. Es independiente de cualquier Registro de tiempo que el usuario esté editando.
_Avoid_: Registro en curso, entrada activa

**Formulario de edición**:
Formulario dedicado a modificar un Registro de tiempo existente sin compartir estado con el Timer activo ni con el formulario de creación manual.
_Avoid_: Modo edición del timer, editar desde la barra

**Editor de registros**:
Diálogo centrado y reutilizable para crear un Registro de tiempo o modificar uno existente desde cualquier pantalla de la aplicación.
_Avoid_: Editor del timer, formulario de la barra

**Marcaje**:
Fichaje del sistema de control horario de la empresa para un usuario: un día y una hora. No lleva dirección propia; entrada o salida se deducen por su posición en el día. Los marcajes son la referencia contra la que se cuadran los Registros de tiempo.
_Avoid_: Fichaje de la app, entrada/salida del timer, clock-in

**Marcaje manual**:
Marcaje que el usuario añade en la app para completar un día cuyo fichaje existió pero no llegó a registrarse. Vive solo en la app y nunca se envía al sistema de control horario. Se puede corregir y borrar; los marcajes que vienen del sistema, no.
_Avoid_: Marcaje inventado, marcaje falso

**Franja fichada**:
Tramo entre un marcaje de entrada y el siguiente de salida, emparejados por posición. El conjunto de franjas de un día es lo que ese día tiene fichado.
_Avoid_: Jornada, horario, turno

**Día fichado válido**:
Día cuyo número de marcajes es par y al menos dos, contando por separado cada hora repetida. Un día con marcajes impares o insuficientes no tiene franjas fiables y queda fuera del cuadre.
_Avoid_: Día incompleto, día roto

**Desajuste por defecto**:
Tiempo dentro de una franja fichada que ningún Registro de tiempo cubre: el Registro empieza después de la entrada o acaba antes de la salida. Se corrige ampliando el Registro hasta el borde de la franja.
_Avoid_: Hueco de marcaje (hueco ya significa otra cosa en la Agenda)

**Desajuste por exceso**:
Registro de tiempo que se sale de su franja fichada, por delante o por detrás. Se corrige recortando el Registro hasta el borde de la franja.
_Avoid_: Exceso de horas, solape (el solape es entre Registros)

**Cuadrar con marcajes**:
Ajustar los horarios de un Registro de tiempo a su franja fichada. Los marcajes son la referencia, pero el cuadre nunca es automático, no impide guardar ni sincronizar y no modifica el Timer activo.
_Avoid_: Validar, bloquear, corregir automáticamente

**Ignorar marcajes**:
Decisión local y reversible de excluir un día del cuadre porque sus marcajes se sabe que están mal.
_Avoid_: Descartar día, desactivar validación
