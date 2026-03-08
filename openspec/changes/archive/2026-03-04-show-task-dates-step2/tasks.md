## 1. Modificar extractor de tareas

- [x] 1.1 Modificar `extractUniqueTasks` en `web-ui/src/lib/csv-parser.js` para retornar array de objetos con `{ name, fechaInicio, fechaFin }` en lugar de strings
- [x] 1.2 Implementar logica de acumulacion de fechas: para cada tarea, mantener fecha de inicio minima y fecha de finalizacion maxima durante la iteracion del CSV
- [x] 1.3 Agregar documentacion JSDoc actualizada para la nueva firma de `extractUniqueTasks`

## 2. Actualizar componente Step2Tasks

- [x] 2.1 Agregar columnas "Fecha Inicio" y "Fecha Fin" al TableHeader en `web-ui/src/components/Step2Tasks.jsx`
- [x] 2.2 Actualizar el mapeo de tareas para usar la nueva estructura de objetos en lugar de strings
- [x] 2.3 Mostrar las fechas en las nuevas columnas de la tabla
- [x] 2.4 Ajustar anchos de columna para acomodar las nuevas columnas de fechas

## 3. Actualizar componente App

- [x] 3.1 Actualizar el estado en `web-ui/src/App.jsx` para almacenar el array de objetos de tareas con sus fechas
- [x] 3.2 Verificar que el mapeo de IDs (`taskMapping`) siga funcionando con la nueva estructura

## 4. Testing y verificacion

- [x] 4.1 Probar con CSV que tiene multiples ocurrencias de la misma tarea en diferentes fechas
- [x] 4.2 Verificar que la fecha de inicio muestra la primera aparicion cronologica
- [x] 4.3 Verificar que la fecha de fin muestra la ultima aparicion
- [x] 4.4 Verificar que la funcionalidad de asignacion de IDs sigue funcionando correctamente
