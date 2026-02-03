## Context

El proyecto actual es un conjunto de scripts Node.js CLI (`extraer-tareas.js` y `generar-sql.js`) que procesan archivos CSV de tiempos y generan SQL para importar a SQL Server. La lógica de procesamiento está en `csv-utils.js`.

Se desea agregar una interfaz web que funcione como alternativa visual al CLI, manteniendo los scripts existentes intactos. La interfaz debe ser un wizard de 3 pasos que opere completamente en el cliente sin backend.

## Goals / Non-Goals

**Goals:**
- Crear SPA (Single Page Application) vanilla JavaScript sin frameworks pesados
- Implementar wizard de 3 pasos con navegación fluida
- Reutilizar lógica de csv-utils.js adaptada para navegador (FileReader API)
- Funcionar completamente offline en el cliente (sin backend)
- Diseño responsive y moderno con CSS vanilla
- Resaltado de sintaxis SQL para mejor legibilidad
- UX intuitiva con feedback visual en cada paso

**Non-Goals:**
- No usar frameworks backend como Next.js (no necesitamos SSR)
- No implementar backend o persistencia de datos (localStorage opcional futuro)
- No soporte para múltiples usuarios o autenticación
- No migrar scripts CLI existentes (permanecen funcionando)
- No soporte offline persistente (PWA con service workers) - posible mejora futura
- No validación compleja de tipos de archivo (solo CSV básico)

## Decisions

### Decision 1: React con Vite, TailwindCSS y shadcn/ui
**Decision**: Usar React como framework principal con Vite como build tool, TailwindCSS para estilos, y shadcn/ui como biblioteca de componentes.

**Rationale**:
- React proporciona estructura clara para el wizard de 3 pasos con estado manejado
- Vite ofrece Hot Module Replacement (HMR) rápido y build optimizado
- TailwindCSS permite desarrollo rápido de UI responsive y moderna
- shadcn/ui proporciona componentes accesibles y bien diseñados (Button, Input, Table, Card, etc.)
- Aunque es más pesado que vanilla, la DX (developer experience) y la calidad del resultado final justifican el costo
- El equipo ya tiene conocimiento de React (inferido de la solicitud)

**Alternatives considered**:
- Vanilla JS: Rechazado - Aunque más ligero, React ofrece mejor organización para el wizard
- Vue 3: Considerado - Buena opción pero React tiene mejor ecosistema de componentes (shadcn/ui)
- Svelte: Considerado - Interesante pero menor ecosistema de componentes UI
- Next.js: Rechazado - Overkill para una SPA estática sin necesidad de SSR

### Decision 2: Arquitectura React con componentes modulares
**Decision**: Estructura de proyecto React estándar con Vite, organizando cada paso del wizard como componente independiente.

**Rationale**:
- Estructura familiar para desarrolladores React
- Cada paso del wizard es un componente React independiente
- Facilita testing con React Testing Library
- Código más mantenible y escalable
- Aprovecha el ecosistema de hooks de React

**Estructura propuesta**:
```
web-ui/
├── index.html              # Entry point
├── vite.config.js          # Configuración Vite
├── tailwind.config.js      # Configuración Tailwind
├── components.json         # Configuración shadcn/ui
├── src/
│   ├── main.jsx           # Entry point React
│   ├── App.jsx            # Componente principal (orquestador wizard)
│   ├── lib/
│   │   ├── utils.js       # Utilidades (cn, helpers)
│   │   ├── csv-parser.js  # Adaptación de csv-utils.js
│   │   └── sql-generator.js # Lógica generación SQL
│   ├── components/
│   │   ├── ui/            # Componentes shadcn/ui (Button, Input, Table, etc.)
│   │   ├── Step1Upload.jsx    # Paso 1: Upload CSV
│   │   ├── Step2Tasks.jsx     # Paso 2: Asignar IDs
│   │   └── Step3Preview.jsx   # Paso 3: Previsualizar SQL
│   ├── hooks/
│   │   └── useWizard.js   # Hook personalizado para estado del wizard
│   └── styles/
│       └── index.css      # Estilos globales + Tailwind
└── public/
    └── (assets estáticos si son necesarios)
```

### Decision 3: Adaptar csv-utils.js para navegador
**Decision**: Crear versión adaptada de csv-utils.js que use FileReader API en lugar de fs.readFileSync.

**Rationale**:
- El navegador no tiene acceso directo al sistema de archivos
- FileReader API permite leer archivos drag-and-drop
- Mantiene la misma lógica de parsing CSV
- Reutilización máxima de código existente

**Cambios necesarios**:
- Reemplazar `fs.readFileSync()` con `FileReader.readAsText()`
- Hacer funciones async (FileReader es asíncrono)
- Mantener lógica de detectarSeparador, parseCSVLine igual

### Decision 4: Manejo de estado con React Hooks (useState + useContext)
**Decision**: Usar React hooks (useState, useContext) para manejar el estado del wizard, evitando Redux u otras librerías de estado global.

**Rationale**:
- React Context + useState es suficiente para estado de wizard simple
- No necesita persistencia entre sesiones
- Más ligero que Redux/Zustand para este caso de uso
- Mejor DX con React DevTools

**Estructura del estado**:
```javascript
const [wizardState, setWizardState] = useState({
  currentStep: 1,
  csvFile: null,
  csvData: { headers: [], rows: [], separador: '' },
  tasks: [], // { name: string, id: number|null, occurrences: number }
  sqlOutput: '',
  isLoading: false,
  error: null
});
```

**Alternatives considered**:
- Redux: Rechazado - Overkill para wizard simple de 3 pasos
- Zustand: Considerado - Buena opción si el estado crece en complejidad
- localStorage: Considerado - Se podría agregar como mejora futura

### Decision 5: Prism.js para resaltado SQL
**Decision**: Usar Prism.js (versión mínima) para resaltado de sintaxis SQL en el paso 3.

**Rationale**:
- Ligero (~2KB min+gzip para solo SQL)
- No requiere build step
- Fácil de integrar
- Mejor UX que texto plano

**Alternatives considered**:
- highlight.js: Más pesado (~10KB+)
- Implementación propiedad: Demasiado trabajo, valor bajo
- highlight.js via CDN: Considerado pero prefiero bundle local

### Decision 6: Servidor de desarrollo con Vite
**Decision**: Usar Vite como servidor de desarrollo (dev dependency).

**Rationale**:
- Soporte nativo ES6 modules
- Hot Module Replacement (HMR)
- Build opcional para producción (minificación)
- Más rápido que http-server o live-server
- No afecta el runtime (solo dev dependency)

## Risks / Trade-offs

- [Duplicación parcial de código] → csv-utils.js y su versión adaptada para web comparten lógica similar. **Mitigación**: Mantener sincronizadas ambas versiones cuando se actualice csv-utils.js. Documentar en ambos archivos.

- [Compatibilidad de navegadores] → ES6 modules y FileReader requieren navegadores modernos (Chrome 61+, Firefox 60+, Safari 10.1+, Edge 16+). **Mitigación**: Agregar nota en README sobre navegadores soportados. No agregar polyfills innecesarios.

- [Estado en memoria] → Si el usuario recarga la página, pierde todo el progreso. **Mitigación**: Esto es aceptable para flujo corto de wizard. Podría agregar localStorage como mejora futura opcional.

- [Límite de tamaño de archivo] → FileReader tiene límites de memoria para archivos CSV muy grandes (100MB+). **Mitigación**: Para uso típico de tiempos mensuales (<1MB CSV), esto no es problema. Documentar limitación.

- [Seguridad XSS] → Mostrar datos CSV sin sanitizar podría ser riesgo XSS. **Mitigación**: Sanitizar contenido CSV antes de insertar en DOM (escapar HTML). No usar innerHTML con datos sin validar.

## Open Questions

1. **¿Dónde se hosteará la interfaz web?** 
   - Opción A: Como archivo estático que abren directamente (file://)
   - Opción B: Servidor local via `npm run web` (localhost:3000)
   - Opción C: Despliegue opcional en servidor web (Netlify, Vercel, etc.)

2. **¿Se necesita soporte para múltiples archivos simultáneos?**
   - Actual: Solo un archivo CSV por sesión
   - Futuro: ¿Posibilidad de comparar/importar múltiples meses?

3. **¿Qué tan importante es el tema oscuro/claro?**
   - Opcional: Implementar toggle tema o seguir preferencia del sistema
   - MVP: Solo tema claro para simplicidad