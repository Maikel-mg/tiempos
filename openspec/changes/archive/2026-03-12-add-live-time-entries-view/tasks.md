## 1. Implementación de la Página de Entradas en Vivo

- [x] 1.1 Crear el componente `web-ui/src/pages/LiveTimeEntriesPage.jsx`
- [x] 1.2 Implementar el estado local para los datos, carga y errores
- [x] 1.3 Crear la función de fetch para llamar a `/api/time-entries`
- [x] 1.4 Implementar el renderizado de la tabla con Tailwind/shadcn components

## 2. Lógica de Formateo y Visualización

- [x] 2.1 Implementar helper para formatear duraciones de Clockify a HH:mm:ss
- [x] 2.2 Implementar helper para formatear fechas a formato local legible
- [x] 2.3 Añadir botón de "Actualizar" para refrescar los datos manualmente
- [x] 2.4 Reemplazar la ruta placeholder en `App.jsx` con el nuevo componente `LiveTimeEntriesPage`

## 3. Verificación y Pulido

- [x] 3.1 Verificar el manejo de errores (ej. simulando que el backend está caído)
- [x] 3.2 Verificar el estado vacío (si no hay entradas)
- [x] 3.3 Asegurar que la tabla sea responsiva en dispositivos móviles
