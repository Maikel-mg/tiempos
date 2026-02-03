## 1. Setup y estructura del proyecto React + Vite

- [x] 1.1 Crear directorio `web-ui/` con estructura React: `src/`, `src/components/`, `src/lib/`, `src/hooks/`, `src/styles/`
- [x] 1.2 Crear `web-ui/package.json` con dependencias: React 18, Vite, TailwindCSS, shadcn/ui, Lucide React
- [x] 1.3 Crear configuración Vite: `vite.config.js` con aliases para `@/`
- [x] 1.4 Crear configuración TailwindCSS: `tailwind.config.js` con tema personalizado y CSS variables
- [x] 1.5 Crear `web-ui/index.html` con estructura base y meta tags responsive
- [x] 1.6 Crear `components.json` para configuración shadcn/ui
- [x] 1.7 Instalar dependencias: `npm install` en directorio web-ui

## 2. Core JavaScript - Módulos base (React)

- [x] 2.1 Crear `web-ui/src/hooks/useWizard.js`: Hook React con useState/useContext para manejo de estado del wizard
- [x] 2.2 Crear `web-ui/src/lib/csv-parser.js`: Adaptar csv-utils.js para FileReader API (async/await)
- [x] 2.3 Crear `web-ui/src/lib/sql-generator.js`: Generar SQL desde datos CSV y mapeo de tareas
- [x] 2.4 Crear `web-ui/src/lib/utils.js`: Función `cn()` para Tailwind + utilidades (copiar clipboard, descargar archivo)
- [x] 2.5 Crear `web-ui/src/styles/index.css`: Estilos globales con Tailwind directives y tema CSS variables

## 3. Componentes UI (shadcn/ui)

- [x] 3.1 Crear `web-ui/src/components/ui/button.jsx`: Componente Button con variants (default, secondary, outline, ghost, destructive)
- [x] 3.2 Crear `web-ui/src/components/ui/card.jsx`: Componentes Card, CardHeader, CardTitle, CardContent, CardFooter
- [x] 3.3 Crear `web-ui/src/components/ui/input.jsx`: Componente Input con estilos shadcn/ui
- [x] 3.4 Crear `web-ui/src/components/ui/table.jsx`: Componentes Table, TableHeader, TableBody, TableRow, TableHead, TableCell
- [x] 3.5 Crear `web-ui/src/components/ui/alert.jsx`: Componente Alert con variantes (default, destructive)
- [x] 3.6 Crear `web-ui/src/components/ui/badge.jsx`: Componente Badge para indicadores visuales
- [x] 3.7 Crear `web-ui/src/components/ui/label.jsx`: Componente Label para formularios
- [x] 3.8 Crear `web-ui/src/components/ui/progress.jsx`: Componente Progress para indicadores de progreso
- [x] 3.9 Crear `web-ui/src/components/ui/textarea.jsx`: Componente Textarea para campos de texto multilinea
- [x] 3.10 Crear `web-ui/src/components/ui/separator.jsx`: Componente Separator para divisores visuales
- [x] 3.11 Crear `web-ui/src/components/ui/scroll-area.jsx`: Componente ScrollArea para contenido scrollable

## 4. Paso 1 - Componente Upload CSV (React)

- [x] 4.1 Crear `web-ui/src/components/Step1Upload.jsx`: Componente React con drag-and-drop y selección de archivo
- [x] 4.2 Implementar detección automática de separador (tab vs coma) usando csv-parser.js
- [x] 4.3 Validar que el archivo sea CSV válido (extensión .csv y contenido parseable)
- [x] 4.4 Mostrar área de drop visual con icono Upload y mensaje "Arrastra tu archivo CSV aquí"
- [x] 4.5 Mostrar nombre del archivo seleccionado, total de registros y tareas únicas extraídas
- [x] 4.6 Habilitar botón "Continuar" solo si archivo es válido y se procesó correctamente
- [x] 4.7 Implementar navegación automática al paso 2 usando hook useWizard
- [x] 4.8 Mostrar error visual si el CSV no tiene las columnas requeridas

## 5. Paso 2 - Componente Asignar IDs (React)

- [x] 5.1 Crear `web-ui/src/components/Step2Tasks.jsx`: Componente React con tabla de tareas
- [x] 5.2 Implementar columnas: Tarea (nombre), ID Proceso (Input numérico editable), Ocurrencias (badge)
- [x] 5.3 Validar input de ID: solo números positivos enteros, mostrar error en tiempo real
- [x] 5.4 Marcar visualmente tareas completadas (verde) vs pendientes (gris) usando Badge
- [x] 5.5 Mostrar contador "X de Y tareas con ID asignado" con Progress bar
- [x] 5.6 Deshabilitar botón "Generar SQL" mientras haya tareas sin ID asignado
- [x] 5.7 Mostrar mensaje de ayuda: "Asigna IDs positivos a todas las tareas para continuar"
- [x] 5.8 Permitir navegación "Volver" al paso 1 conservando datos CSV cargados en estado
- [x] 5.9 Agregar búsqueda/filter para encontrar tareas rápidamente en lista larga

## 6. Paso 3 - Componente Previsualizar SQL (React)

- [x] 6.1 Crear `web-ui/src/components/Step3Preview.jsx`: Componente React para mostrar SQL
- [x] 6.2 Mostrar SQL generado en Textarea estilo código (fondo oscuro, fuente monospace)
- [x] 6.3 Mostrar resumen: total sentencias SQL, registros procesados, errores (si hay)
- [x] 6.4 Implementar botón "Copiar al portapapeles" usando Clipboard API con notificación visual
- [x] 6.5 Implementar botón "Descargar archivo .sql" usando Blob y URL.createObjectURL
- [x] 6.6 Permitir navegación "Volver" al paso 2 para modificar IDs sin perder datos
- [x] 6.7 Agregar botón "Nueva importación" para reiniciar wizard completo (resetear estado)

## 7. Componente Principal y Orquestación

- [x] 7.1 Crear `web-ui/src/App.jsx`: Componente principal con Wizard Progress Indicator
- [x] 7.2 Implementar indicador de 3 pasos visual: "1. Subir CSV", "2. Asignar IDs", "3. Ver SQL"
- [x] 7.3 Mostrar paso actual activo y pasos completados con checkmark
- [x] 7.4 Renderizar componente de paso actual según state.step
- [x] 7.5 Proveer contexto/estado global a todos los pasos mediante useWizard hook
- [x] 7.6 Manejar errores globales y mostrar Alert cuando ocurra error inesperado

## 8. Punto de entrada React

- [x] 8.1 Crear `web-ui/src/main.jsx`: Punto de entrada React con ReactDOM.createRoot
- [x] 8.2 Importar estilos globales: `import './styles/index.css'`
- [x] 8.3 Renderizar componente `<App />` dentro de StrictMode

## 9. Integración con proyecto principal

- [x] 9.1 Actualizar `package.json` raíz: agregar script `"web": "cd web-ui && npm run dev"`
- [x] 9.2 Verificar que scripts CLI siguen funcionando: `npm run extract`, `npm run generate`
- [x] 9.3 No breaking changes en scripts existentes (extraer-tareas.js, generar-sql.js)

## 10. Documentación

- [x] 10.1 Crear `web-ui/README.md`: Documentación específica de la interfaz web
- [x] 10.2 Actualizar `README.md` raíz: agregar sección "Interfaz Web (Alternativa)"
- [x] 10.3 Documentar comando `npm run web` en README principal
- [x] 10.4 Agregar nota sobre navegadores compatibles (Chrome 90+, Firefox 88+, Edge 90+)
- [x] 10.5 Documentar estructura de archivos y tecnologías usadas (React, Vite, Tailwind, shadcn/ui)

## 11. Build y Verificación

- [x] 11.1 Ejecutar `npm run build` en web-ui: compilar sin errores
- [x] 11.2 Verificar que build genera archivos en `web-ui/dist/`
- [x] 11.3 Revisar que todos los escenarios del spec.md están implementados
- [x] 11.4 Marcar todas las tareas como completas en tasks.md

## 12. Testing (Manual)

- [x] 12.1 Probar flujo completo end-to-end: upload CSV → asignar IDs → generar SQL → copiar/descargar
- [x] 12.2 Probar navegación: avanzar y retroceder entre pasos, datos persisten
- [x] 12.3 Probar casos de error: CSV inválido, IDs negativos, archivo vacío, columnas faltantes
- [x] 12.4 Probar copiar al portapapeles y verificar contenido
- [x] 12.5 Probar descargar archivo SQL y comparar con CLI (deben ser idénticos)
- [x] 12.6 Verificar que scripts CLI siguen funcionando sin cambios
- [x] 12.7 Testing responsive: mobile, tablet, desktop layouts