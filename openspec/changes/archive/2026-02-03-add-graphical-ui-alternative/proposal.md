## Why

Los usuarios no técnicos necesitan una forma más intuitiva de importar tiempos sin usar la línea de comandos. Aunque los scripts CLI funcionan bien para usuarios técnicos, una interfaz web con wizard guiado hará el proceso accesible para cualquier persona, permitiendo arrastrar archivos, editar tareas visualmente y previsualizar el SQL antes de generarlo.

## What Changes

- Crear nueva aplicación web `web-ui/` que funcione como alternativa a los scripts CLI
- Implementar wizard de 3 pasos:
  1. **Upload**: Arrastrar o seleccionar archivo CSV, detectar automáticamente el separador
  2. **Asignar IDs**: Tabla editable mostrando tareas extraídas del CSV con campos para asignar IDs numéricos
  3. **Previsualizar SQL**: Mostrar SQL generado con resaltado de sintaxis, botones para copiar al portapapeles o descargar archivo .sql
- La aplicación web debe funcionar completamente en el cliente (sin backend necesario) usando las mismas lógicas de csv-utils.js
- Los scripts CLI (`extraer-tareas.js`, `generar-sql.js`) siguen funcionando exactamente igual
- Agregar comando npm `npm run web` para iniciar el servidor de desarrollo
- Documentar en README cómo usar la interfaz web

## Capabilities

### New Capabilities
- `web-import-wizard`: Interfaz web tipo wizard de 3 pasos para importar tiempos desde CSV a SQL

### Modified Capabilities
<!-- None - esta es una capacidad puramente aditiva -->

## Impact

- **Nuevos archivos:**
  - `web-ui/index.html` - Estructura HTML del wizard
  - `web-ui/app.js` - Lógica del wizard y manejo de estados
  - `web-ui/styles.css` - Estilos modernos y responsive
  - `web-ui/wizard/` - Componentes para cada paso del wizard
  - `web-ui/components/` - Componentes reutilizables (tabla editable, visor SQL, etc.)
- **Archivos existentes modificados:**
  - `package.json`: Agregar scripts para iniciar servidor web y posiblemente dependencias de desarrollo
  - `README.md`: Documentar la opción de interfaz web
- **Dependencias posibles:**
  - Servidor de desarrollo simple (http-server, live-server, o vite)
  - Resaltado de sintaxis SQL (prismjs, highlight.js, o solución vanilla)
- **No breaking changes:** Los scripts CLI funcionan exactamente igual que antes