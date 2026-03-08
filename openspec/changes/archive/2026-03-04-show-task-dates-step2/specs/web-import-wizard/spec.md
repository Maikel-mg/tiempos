## MODIFIED Requirements

### Requirement: Wizard muestra tareas extraidas en tabla editable para asignar IDs
El sistema SHALL mostrar una tabla editable con todas las tareas unicas extraidas del CSV, permitiendo al usuario asignar un ID numerico a cada tarea.

#### Scenario: Usuario visualiza tareas extraidas
- **WHEN** el usuario llega al paso 2 del wizard
- **THEN** el sistema muestra una tabla con columnas: "Tarea" (nombre), "Fecha Inicio" (primera aparicion), "Fecha Fin" (ultima aparicion), "ID Proceso" (campo editable)
- **AND** el sistema muestra el numero total de tareas unicas
- **AND** el sistema muestra un indicador visual de que tareas aun no tienen ID asignado
- **AND** la columna "Fecha Inicio" muestra la fecha mas antigua del campo "fecha de inicio" para cada tarea
- **AND** la columna "Fecha Fin" muestra la fecha del campo "fecha de finalizacion" de la ultima ocurrencia de cada tarea

#### Scenario: Usuario asigna IDs a tareas
- **WHEN** el usuario ingresa un numero en el campo "ID Proceso" de una tarea
- **THEN** el sistema valida que sea un numero positivo entero
- **AND** el sistema marca la tarea como "Completada" visualmente
- **AND** el sistema actualiza el contador de tareas pendientes

#### Scenario: Tarea con ID invalido
- **WHEN** el usuario ingresa un valor no numerico, negativo, o cero en el campo ID
- **THEN** el sistema muestra mensaje de error "El ID debe ser un numero positivo"
- **AND** el sistema no marca la tarea como completada
- **AND** el boton "Continuar" permanece deshabilitado

#### Scenario: Faltan IDs por asignar
- **WHEN** hay tareas sin ID asignado
- **THEN** el boton "Continuar" esta deshabilitado
- **AND** el sistema muestra mensaje "Asigna IDs a todas las tareas para continuar"

#### Scenario: Todos los IDs asignados
- **WHEN** el usuario ha asignado un ID valido a todas las tareas
- **THEN** el boton "Continuar" se habilita
- **AND** el usuario puede hacer clic para avanzar al paso 3
