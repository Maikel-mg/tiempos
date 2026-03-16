## ADDED Requirements

### Requirement: Visualización de entradas de tiempo en tiempo real
El sistema SHALL permitir al usuario visualizar las entradas de tiempo registradas en Clockify mediante una tabla informativa.

#### Scenario: Carga de entradas de tiempo
- **WHEN** el usuario accede a la ruta `/live-entries`
- **THEN** el sistema SHALL realizar una petición GET a `/api/time-entries`
- **AND** SHALL mostrar un indicador de carga (spinner o esqueleto) mientras se reciben los datos

#### Scenario: Visualización exitosa de datos
- **WHEN** los datos se reciben correctamente del backend
- **THEN** el sistema SHALL mostrar una tabla con las siguientes columnas:
  - **Fecha**: Fecha de inicio de la entrada
  - **Proyecto**: Nombre del proyecto asociado
  - **Descripción**: Descripción de la tarea realizada
  - **Duración**: Tiempo total transcurrido en formato HH:mm:ss
- **AND** SHALL mostrar el número total de entradas recuperadas

#### Scenario: Error en la carga de datos
- **WHEN** la petición al backend falla (error de red o de API)
- **THEN** el sistema SHALL mostrar un mensaje de error claro al usuario
- **AND** SHALL ofrecer un botón para reintentar la carga de datos

#### Scenario: No hay entradas de tiempo
- **WHEN** la API devuelve una lista vacía de entradas
- **THEN** el sistema SHALL mostrar un mensaje informativo indicando que no hay registros en el rango de fechas actual

### Requirement: Diseño de tabla responsivo y legible
La tabla de entradas SHALL ser fácil de leer y adaptarse a diferentes tamaños de pantalla.

#### Scenario: Formato de duración
- **WHEN** se muestra la duración de una entrada
- **THEN** el sistema SHALL convertir los datos crudos de Clockify a un formato legible de horas, minutos y segundos (ej. "02:30:00")

#### Scenario: Orden cronológico
- **WHEN** se listan las entradas
- **THEN** el sistema SHALL mostrarlas ordenadas por fecha de inicio, con las más recientes primero
