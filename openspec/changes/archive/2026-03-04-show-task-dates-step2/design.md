## Context

El wizard de importacion actualmente extrae tareas unicas del CSV y las muestra en una tabla en el paso 2. Cada fila muestra el nombre de la tarea y un campo para asignar el ID de proceso. El CSV contiene multiples registros por tarea, cada uno con campos de fecha de inicio y fecha de finalizacion.

La funcion `extractUniqueTasks` en `csv-parser.js` itera sobre las filas del CSV y usa un `Set` para obtener nombres unicos. No almacena informacion adicional sobre las fechas.

## Goals / Non-Goals

**Goals:**
- Mostrar fecha de inicio teorica (primera aparicion cronologica) y fecha de fin teorica (ultima aparicion) para cada tarea en la tabla del paso 2
- Calcular estas fechas durante el parseo inicial del CSV, sin requerir re-procesamiento
- Mantener la funcionalidad existente de asignacion de IDs intacta

**Non-Goals:**
- Cambiar la logica de generacion de SQL
- Agregar validacion de fechas o calculo de duracion
- Modificar el formato de visualizacion de fechas (se mostraran tal como vienen en el CSV)

## Decisions

### D1: Estructura de datos para tareas

**Decision:** Modificar `extractUniqueTasks` para retornar un objeto por cada tarea con `{ name, fechaInicio, fechaFin }` en lugar de solo strings.

**Rationale:** Permite mantener la informacion temporal asociada a cada tarea sin cambiar significativamente la arquitectura. Las fechas se calculan una sola vez durante el parseo.

**Alternativas consideradas:**
- Retornar un Map separado de fechas: Mas complejo de mantener sincronizado
- Calcular fechas bajo demanda: Requiere iterar el CSV multiple veces

### D2: Algoritmo de calculo de fechas

**Decision:** Durante la iteracion del CSV, mantener un objeto que acumule para cada tarea:
- La fecha de inicio mas antigua (minima)
- La fecha de finalizacion mas reciente (maxima)

**Rationale:** Simple y eficiente (O(n) donde n = filas del CSV). Las fechas del CSV ya estan en formato sortable (DD/MM/YYYY o similar), se comparan lexicograficamente despues de normalizar.

### D3: Actualizacion del componente Step2Tasks

**Decision:** Agregar dos columnas nuevas a la tabla: "Fecha Inicio" y "Fecha Fin". La columna "Nombre de Tarea" se mantiene en la primera posicion.

**Rationale:** Mantiene el flujo visual existente. Las fechas son informacion adicional de contexto, no el foco principal de la interaccion.

## Risks / Trade-offs

- **Riesgo:** Formato de fecha inconsistente en el CSV puede causar ordenamiento incorrecto - Se asume que el CSV tiene fechas en formato consistente (ya funciona asi para la generacion de SQL)
- **Trade-off:** Mayor uso de memoria al almacenar fechas adicionales - Impacto minimo dado el volumen tipico de tareas (decenas a cientos)
