## MODIFIED Requirements

### Requirement: Wizard muestra tareas extraídas en tabla editable para asignar IDs
El sistema SHALL mostrar una tabla editable con todas las tareas únicas extraídas del CSV, permitiendo al usuario asignar un ID numérico a cada tarea. La tabla SHALL tener un diseño espacioso que permita leer los nombres de tareas y fechas cómodamente.

#### Scenario: Usuario visualiza tareas extraídas
- **WHEN** el usuario llega al paso 2 del wizard
- **THEN** el sistema muestra una tabla con columnas: "Tarea" (nombre), "Fecha Inicio" (primera aparicion), "Fecha Fin" (ultima aparicion), "ID Proceso" (campo editable)
- **AND** el sistema muestra el número total de tareas únicas
- **AND** el sistema muestra un indicador visual de qué tareas aún no tienen ID asignado
- **AND** la columna "Fecha Inicio" muestra la fecha más antigua del campo "fecha de inicio" para cada tarea
- **AND** la columna "Fecha Fin" muestra la fecha del campo "fecha de finalizacion" de la ultima ocurrencia de cada tarea
- **AND** la columna de nombre de tarea tiene suficiente ancho para mostrar nombres largos sin truncamiento excesivo
- **AND** el nombre de tarea truncado muestra tooltip con el nombre completo al pasar el mouse

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
