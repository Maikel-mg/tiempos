## Why

El panel de configuración de base de datos en el paso 1 ocupa espacio constantemente en la pantalla, incluso cuando ya está configurado y guardado. Esto desperdicia espacio de UI y dificulta la visualización de otros elementos importantes. Los usuarios necesitan ver el panel solo cuando necesitan modificar la configuración, no como elemento permanente.

## What Changes

- Agregar funcionalidad de colapso/expansión al panel de configuración de base de datos en el paso 1
- Cuando no hay configuración guardada: el panel debe estar expandido por defecto (visible)
- Cuando existe configuración guardada: el panel debe estar colapsado por defecto
- Agregar indicador visual que muestre el estado de configuración cuando el panel está colapsado
- Persistir el estado de colapso/expansión durante la sesión del usuario
- Agregar botón/icono para expandir/colapsar el panel

## Capabilities

### New Capabilities
- `collapsible-db-panel`: Funcionalidad para colapsar/expandir el panel de configuración de base de datos con comportamiento condicional basado en el estado de configuración

### Modified Capabilities
- `step-1-database-config`: Modificar el componente de configuración de base de datos para soportar estado colapsable y comportamiento por defecto según si existe configuración guardada

## Impact

- Componente UI del paso 1 (configuración de base de datos)
- Estado local del componente para manejar colapso/expansión
- Lógica de detección de configuración existente
- Posible impacto en tests de UI existentes
