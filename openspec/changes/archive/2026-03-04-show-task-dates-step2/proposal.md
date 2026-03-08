## Why

En el paso 2 del wizard, los usuarios necesitan contexto temporal para asignar IDs de proceso correctamente. Actualmente solo ven el nombre de la tarea, sin informacion sobre cuando ocurrio cada una. Esto dificulta la toma de decisiones al asignar IDs porque no hay forma de saber el rango temporal de cada tarea.

## What Changes

- Agregar dos columnas nuevas a la tabla del paso 2:
  - **Fecha Inicio**: Primera aparicion de la tarea en el CSV (basado en el campo fecha de inicio, ordenado cronologicamente)
  - **Fecha Fin**: Ultima aparicion de la tarea en el CSV (basado en el campo fecha de finalizacion, el valor de este campo para la ultima ocurrencia ordenada por fecha)

- Modificar la extraccion de tareas para calcular estas fechas teoricas durante el parseo del CSV

## Capabilities

### New Capabilities

(Ninguna - esta es una mejora dentro de una capacidad existente)

### Modified Capabilities

- `web-import-wizard`: El requerimiento "Wizard muestra tareas extraidas en tabla editable para asignar IDs" cambia para incluir informacion temporal de cada tarea

## Impact

- `web-ui/src/lib/csv-parser.js`: Modificar `extractUniqueTasks` para retornar no solo nombres de tareas sino tambien fechas de inicio y fin teoricas
- `web-ui/src/components/Step2Tasks.jsx`: Agregar columnas "Fecha Inicio" y "Fecha Fin" a la tabla, actualizar la interfaz para recibir y mostrar estos datos
- `web-ui/src/App.jsx`: Actualizar el estado para almacenar las fechas de las tareas
- `openspec/specs/web-import-wizard/spec.md`: Actualizar el spec para reflejar las nuevas columnas en la tabla
