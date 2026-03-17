# Importador de Tiempos - Web UI

Herramienta web para importar tiempos desde CSV (exportado de app externa) a SQL Server mediante procedimiento almacenado.

## Interfaz Web

La aplicación web proporciona una interfaz gráfica completa para el proceso de importación, funcionando completamente en el navegador.

### Iniciar interfaz web

```bash
npm run web
```

Esto abrirá un servidor de desarrollo en `http://localhost:5173` con un wizard de 3 pasos:

1. **Subir CSV**: Arrastra o selecciona tu archivo CSV
2. **Asignar IDs**: Tabla visual para asignar IDs de proceso a cada tarea
3. **Generar SQL**: Previsualización con resaltado de sintaxis y opciones para copiar/descargar

### Backend

El servidor backend proporciona API endpoints para la web UI:

```bash
npm run start
```

Para desarrollo con recarga automática:

```bash
npm run dev-backend
```

### Características de la Web UI

- Drag & drop de archivos CSV
- Detección automática de separador (tab/coma)
- Tabla editable con validación de IDs
- Vista previa SQL con syntax highlighting
- Copiar al portapapeles o descargar como .sql
- Diseño responsive y moderno

Para más detalles, ver [web-ui/README.md](web-ui/README.md).

## Formato CSV Esperado

El CSV debe usar tabuladores como separadores y tener estas columnas:

- Proyecto
- Cliente
- Descripción
- Tarea
- Usuario
- Grupo
- Correo electrónico
- Etiquetas
- Facturable
- Fecha de inicio
- Hora de inicio
- Fecha de finalización
- Hora de finalización
- Duración (h)
- Duración (decimal)
- Tarifa facturable (EUR)
- Importe facturable (EUR)
- Date of creation

## Ejemplo de Uso

1. Exporta tiempos de tu app externa a CSV
2. Inicia la web UI: `npm run web`
3. Navega a `http://localhost:5173`
4. Sube tu archivo CSV
5. Asigna IDs de proceso a cada tarea
6. Genera y descarga el archivo SQL
7. Ejecuta el SQL generado en SQL Server

## Notas

- La web UI funciona completamente en el navegador con FileReader API
- Las horas decimales se convierten automáticamente a minutos
- Las fechas deben estar en formato DD/MM/AAAA
- Las descripciones con comillas simples se escapan automáticamente
- Requiere Node.js 18+ para ejecutar el servidor backend
- Web UI usa React 18 + Vite 5 + TailwindCSS
