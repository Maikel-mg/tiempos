# Importador de Tiempos

Herramienta para importar tiempos desde CSV (exportado de app externa) a SQL Server mediante procedimiento almacenado.

## Flujo de Trabajo

### Paso 1: Extraer tareas únicas
```bash
node extraer-tareas.js datos.csv
```

Esto genera `tareas_mapeo.json` con las tareas encontradas en el CSV.

### Paso 2: Asignar IDs
Abre `tareas_mapeo.json` y reemplaza los valores `null` por los IDs de proceso de tu empresa:

```json
{
  "IPKWEB. 202601 - Consolidacion Tabla Eliminaacion Obras": 12345,
  "OTRA TAREA": 67890
}
```

### Paso 3: Generar SQL
```bash
node generar-sql.js datos.csv
```

Esto genera `tiempos.sql` con las llamadas al procedimiento `spNETTiempos_Alta`.

## Configuración

Edita `config.json` para ajustar parámetros:
- `usuario`: Código de usuario (MG01 por defecto)
- `teletrabajo`: Flag de teletrabajo (1 por defecto)
- `tipoHora`: Tipo de hora (11 por defecto)

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

## Ejemplo

1. Exporta tiempos de tu app externa a CSV
2. Copia el CSV a esta carpeta
3. Ejecuta: `node extraer-tareas.js export.csv`
4. Edita `tareas_mapeo.json` con los IDs
5. Ejecuta: `node generar-sql.js export.csv`
6. Ejecuta el SQL generado en SQL Server

## Notas

- El script valida que todas las tareas tengan ID asignado antes de generar SQL
- Las horas decimales se convierten automáticamente a minutos
- Las fechas deben estar en formato DD/MM/AAAA
- Las descripciones con comillas simples se escapan automáticamente
