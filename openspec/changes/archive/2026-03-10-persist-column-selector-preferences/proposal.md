## Why

El selector de columnas en la vista de previsualización de CSV pierde su estado (columnas visibles/ocultas) al recargar la página o navegar away. Esto requiere que los usuarios reconfiguren manualmente las columnas en cada sesión, reduciendo la eficiencia para usuarios que trabajan frecuentemente con archivos CSV similares o usan las mismas columnas regularmente.

## What Changes

- Añadir persistencia de preferencias de columnas usando localStorage del navegador
- Cargar automáticamente la configuración guardada al iniciar el componente Step3Preview
- Guardar preferencias cada vez que el usuario modifica columnas visibles/ocultas
- Usar enfoque global: misma configuración aplica a cualquier archivo CSV (no específica por archivo)
- Implementar fallback seguro: usar valores por defecto si localStorage está vacío, corrupto, o las columnas guardadas no existen en el CSV actual
- Mantener compatibilidad hacia atrás: comportamiento idéntico si localStorage no está disponible

## Capabilities

### New Capabilities

- `column-selector-persistence`: Permite guardar y recuperar preferencias de columnas visibles/ocultas entre sesiones del navegador. Persiste el conjunto de columnas ocultas y lo restaura automáticamente en cada carga.

### Modified Capabilities

- Ninguno. El comportamiento de la UI permanece igual; solo se añade persistencia del estado existente.

## Impact

- **Archivos modificados:** `web-ui/src/components/Step3Preview.jsx`
- **Nuevas dependencias:** Ninguna (usa localStorage nativo del navegador)
- **API:** No hay cambios en endpoints del backend
- **Compatibilidad:** No hay cambios que rompan compatibilidad existente
- **Navegadores:** Requiere soporte para localStorage (soportado en todos los navegadores modernos)