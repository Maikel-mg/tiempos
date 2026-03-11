# Web UI - Importador de Tiempos

Interfaz web completa para importar tiempos desde CSV a SQL Server. Funciona 100% en el navegador sin necesidad de backend.

## Características

- ✅ Funciona completamente en el navegador (sin backend)
- ✅ Drag & drop de archivos CSV
- ✅ Detección automática de separador (TAB o coma)
- ✅ Asignación visual de IDs de tareas
- ✅ Generación de SQL con validación
- ✅ Vista previa con syntax highlighting
- ✅ Descarga del archivo .sql generado
- ✅ Copiar al portapapeles
- ✅ Responsive con TailwindCSS
- ✅ Componentes shadcn/ui

## Estructura del Proyecto

```
web-ui/
├── src/
│   ├── components/
│   │   ├── ui/           # Componentes shadcn/ui
│   │   ├── Step1Upload.jsx    # Paso 1: Subir CSV
│   │   ├── Step2Tasks.jsx     # Paso 2: Asignar tareas
│   │   └── Step3Preview.jsx   # Paso 3: Vista previa SQL
│   ├── hooks/
│   │   └── useWizard.js       # Hook de estado del wizard
│   ├── lib/
│   │   ├── csv-parser.js      # Parser de CSV (FileReader API)
│   │   ├── sql-generator.js   # Generador de SQL
│   │   └── utils.js           # Utilidades (cn function)
│   ├── styles/
│   │   └── index.css          # Estilos Tailwind
│   ├── App.jsx                # Componente principal
│   └── main.jsx               # Punto de entrada React
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── components.json            # Config shadcn/ui
```

## Requisitos

- Node.js 18+
- npm o yarn

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Build para producción

```bash
npm run build
```

Los archivos generados estarán en la carpeta `dist/`.

## Uso

1. **Paso 1 - Subir CSV**: 
   - Arrastra tu archivo CSV o selecciónalo
   - Configura usuario y tipo de hora
   - Haz clic en "Procesar Archivo"

2. **Paso 2 - Asignar Tareas**:
   - Verás todas las tareas únicas encontradas en el CSV
   - Asigna un ID numérico positivo a cada tarea
   - Cuando todas tengan ID válido, genera el SQL

3. **Paso 3 - Vista Previa**:
   - Revisa las sentencias SQL generadas
   - Copia al portapapeles o descarga como .sql
   - Vuelve atrás si necesitas corregir algo

## Columnas CSV Requeridas

El CSV debe contener las siguientes columnas:
- **Tarea**: Nombre de la tarea
- **Fecha de inicio**: DD/MM/AAAA
- **Hora de inicio**: HH:MM:SS
- **Fecha de finalización**: DD/MM/AAAA
- **Hora de finalización**: HH:MM:SS
- **Duración (decimal)**: Horas en formato decimal (ej: 1,5)

Columna opcional:
- **Descripción**: Descripción del trabajo realizado

## Soporte de Formatos

- Separadores: TAB o coma (detectado automáticamente)
- Codificación: UTF-8 (configurable)
- Campos entrecomillados: Soportado

## Tecnologías

- React 18
- Vite 5
- TailwindCSS 3
- shadcn/ui
- Lucide Icons
