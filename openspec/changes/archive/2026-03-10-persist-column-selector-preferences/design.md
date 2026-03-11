## Context

El componente `Step3Preview.jsx` gestiona la visualización de datos CSV y permite al usuario ocultar/mostrar columnas. Actualmente, las preferencias de columnas visibles se almacenan solo en estado React (`hiddenColumns`), perdiéndose al recargar la página. El objetivo es persistir estas preferencias en localStorage del navegador para mejorar la experiencia del usuario.

## Goals / Non-Goals

**Goals:**
- Persistir el conjunto de columnas ocultadas en localStorage
- Restaurar automáticamente las preferencias al cargar un nuevo CSV
- Mantener fallback a valores por defecto cuando las preferencias no sean válidas

**Non-Goals:**
- Persistencia por archivo CSV individual (enfoque global)
- Sincronización entre diferentes navegadores/dispositivos
- Persistencia de otras preferencias de UI (solo columnas)

## Decisions

### 1. Clave de storage
**Decisión:** Usar `'csv-import-hidden-columns'` como clave en localStorage.

**Alternativas consideradas:**
- `'columnSelectorHidden'` - más genérico
- `'step3-hidden-columns'` - específico pero largo
- **Elegido:** `'csv-import-hidden-columns'` - descriptivo y con prefijo para evitar conflictos

### 2. Formato de almacenamiento
**Decisión:** Guardar como JSON array de nombres de columnas.

```js
// Ejemplo: localStorage.getItem('csv-import-hidden-columns')
// "[\"Usuario\",\"Grupo\",\"Correo Electronico\"]"
```

**Alternativas consideradas:**
- Objeto con flags por columna - más complejo
- **Elegido:** Array simple - menor tamaño y fácil de filtrar contra headers actuales

### 3. Estrategia de carga
**Decisión:** Cargar preferences en un useEffect separado que se ejecuta cuando `allHeaders` está disponible.

**Alternativas consideradas:**
- Inicializar en el hook useState directamente - problema: no hay headers disponibles
- Cargar antes del render - puede causar hydration mismatch
- **Elegido:** useEffect con condición `allHeaders.length > 0` - permite validación contra headers actuales

### 4. Estrategia de guardado
**Decisión:** Guardar en cada cambio de `hiddenColumns` mediante useEffect.

**Alternativas consideradas:**
- Guardar solo al cerrar componente - puede perder cambios si no se desmonta
- Debounce del guardado - overkill para este caso de uso
- **Elegido:** useEffect directo - simple y efectivo para esta funcionalidad

## Risks / Trade-offs

- **[Riesgo]: localStorage no disponible en modo privado** → Mitigación: try-catch en lecturas/escrituras, fallback a valores por defecto
- **[Riesgo]: CSV con columnas diferentes a las guardadas** → Mitigación: filtrar columnas guardadas contra `allHeaders`, usar solo las que existen
- **[Riesgo]: JSON corrupto en localStorage** → Mitigación: try-catch en JSON.parse, fallback a defaults si falla

## Migration Plan

1. Agregar constante `STORAGE_KEY` al inicio del componente
2. Crear función auxiliar para cargar preferencias con validación
3. Crear función auxiliar para guardar preferencias
4. Modificar el useEffect existente de hiddenColumns para guardar cambios
5. Agregar useEffect para cargar preferencias al montar (cuando hay headers)
6. Probar con varios CSVs para verificar funcionalidad

## Open Questions

- ¿Deberíamos también persistir el orden de columnas? (actualmente no hay reorder)
- ¿Queremos añadir un botón para "resetear a defaults"? (por ahora no necesario)