## ADDED Requirements

### Requirement: Wizard permite subir archivo CSV mediante drag-and-drop o selección
El sistema SHALL permitir al usuario seleccionar un archivo CSV mediante arrastrar y soltar (drag-and-drop) o mediante un selector de archivos tradicional.

#### Scenario: Usuario arrastra archivo CSV al área de drop
- **WHEN** el usuario arrastra un archivo .csv al área designada
- **THEN** el sistema detecta automáticamente el separador (tab o coma)
- **AND** el sistema valida que el archivo tenga formato CSV válido
- **AND** el sistema extrae las tareas únicas del archivo
- **AND** el sistema muestra el número total de registros y tareas únicas encontradas
- **AND** el sistema avanza automáticamente al paso 2

#### Scenario: Usuario selecciona archivo mediante selector
- **WHEN** el usuario hace clic en "Seleccionar archivo" y elige un archivo .csv
- **THEN** el sistema detecta automáticamente el separador (tab o coma)
- **AND** el sistema valida que el archivo tenga formato CSV válido
- **AND** el sistema extrae las tareas únicas del archivo
- **AND** el sistema muestra el nombre del archivo seleccionado
- **AND** el sistema muestra el botón "Continuar" para avanzar al paso 2

#### Scenario: Archivo CSV inválido
- **WHEN** el usuario intenta subir un archivo que no es CSV o está corrupto
- **THEN** el sistema muestra mensaje de error "El archivo no es un CSV válido"
- **AND** el sistema no avanza al paso 2

### Requirement: Wizard muestra tareas extraídas en tabla editable para asignar IDs
El sistema SHALL mostrar una tabla editable con todas las tareas únicas extraídas del CSV, permitiendo al usuario asignar un ID numérico a cada tarea.

#### Scenario: Usuario visualiza tareas extraídas
- **WHEN** el usuario llega al paso 2 del wizard
- **THEN** el sistema muestra una tabla con columnas: "Tarea" (nombre), "ID Proceso" (campo editable), "Ocurrencias" (número de veces en CSV)
- **AND** el sistema muestra el número total de tareas únicas
- **AND** el sistema muestra un indicador visual de qué tareas aún no tienen ID asignado

#### Scenario: Usuario asigna IDs a tareas
- **WHEN** el usuario ingresa un número en el campo "ID Proceso" de una tarea
- **THEN** el sistema valida que sea un número positivo entero
- **AND** el sistema marca la tarea como "Completada" visualmente
- **AND** el sistema actualiza el contador de tareas pendientes

#### Scenario: Tarea con ID inválido
- **WHEN** el usuario ingresa un valor no numérico, negativo, o cero en el campo ID
- **THEN** el sistema muestra mensaje de error "El ID debe ser un número positivo"
- **AND** el sistema no marca la tarea como completada
- **AND** el botón "Continuar" permanece deshabilitado

#### Scenario: Faltan IDs por asignar
- **WHEN** hay tareas sin ID asignado
- **THEN** el botón "Continuar" está deshabilitado
- **AND** el sistema muestra mensaje "Asigna IDs a todas las tareas para continuar"

#### Scenario: Todos los IDs asignados
- **WHEN** el usuario ha asignado un ID válido a todas las tareas
- **THEN** el botón "Continuar" se habilita
- **AND** el usuario puede hacer clic para avanzar al paso 3

### Requirement: Wizard genera y muestra SQL con opción de copiar o descargar
El sistema SHALL generar automáticamente el SQL basado en los datos del CSV y los IDs asignados, mostrándolo con resaltado de sintaxis y opciones para copiar o descargar.

#### Scenario: Visualización del SQL generado
- **WHEN** el usuario llega al paso 3 del wizard
- **THEN** el sistema genera el SQL usando la misma lógica que generar-sql.js
- **AND** el sistema muestra el SQL con resaltado de sintaxis (coloreado)
- **AND** el sistema muestra el número total de sentencias SQL generadas
- **AND** el sistema muestra un resumen: registros procesados, errores (si hay)

#### Scenario: Usuario copia SQL al portapapeles
- **WHEN** el usuario hace clic en el botón "Copiar al portapapeles"
- **THEN** el sistema copia todo el contenido SQL al portapapeles
- **AND** el sistema muestra notificación "¡SQL copiado al portapapeles!"

#### Scenario: Usuario descarga archivo SQL
- **WHEN** el usuario hace clic en el botón "Descargar archivo .sql"
- **THEN** el sistema genera archivo `tiempos.sql` con el contenido
- **AND** el sistema inicia descarga automática del archivo
- **AND** el archivo descargado tiene formato correcto con saltos de línea y GO entre sentencias

### Requirement: Wizard funciona completamente en el cliente sin backend
El sistema SHALL funcionar completamente en el navegador del cliente sin requerir un servidor backend.

#### Scenario: Aplicación funciona offline
- **WHEN** el usuario abre la aplicación web en su navegador
- **THEN** todos los pasos del wizard funcionan sin conexión a internet
- **AND** el procesamiento del CSV ocurre en el cliente usando FileReader API
- **AND** la generación de SQL ocurre en el cliente usando JavaScript

#### Scenario: No se envían datos a servidor externo
- **WHEN** el usuario procesa un archivo CSV con información sensible
- **THEN** el archivo nunca se transmite fuera del navegador del usuario
- **AND** todos los datos permanecen en la memoria local del cliente
- **AND** al cerrar la pestaña, todos los datos se liberan

### Requirement: Wizard permite navegación entre pasos
El sistema SHALL permitir al usuario navegar hacia adelante y atrás entre los pasos del wizard.

#### Scenario: Navegación hacia adelante
- **WHEN** el usuario completa un paso y hace clic en "Continuar"
- **THEN** el sistema avanza al siguiente paso
- **AND** el sistema actualiza el indicador de progreso del wizard
- **AND** el paso anterior queda marcado como completado

#### Scenario: Navegación hacia atrás
- **WHEN** el usuario hace clic en "Volver"
- **THEN** el sistema regresa al paso anterior
- **AND** el sistema preserva los datos ingresados en el paso actual
- **AND** el usuario puede modificar datos y volver a avanzar

#### Scenario: Indicador de progreso visual
- **WHEN** el usuario está en cualquier paso del wizard
- **THEN** el sistema muestra indicador de progreso con 3 pasos: "1. Subir CSV", "2. Asignar IDs", "3. Generar SQL"
- **AND** el paso actual está resaltado visualmente
- **AND** los pasos completados muestran checkmark o indicador visual