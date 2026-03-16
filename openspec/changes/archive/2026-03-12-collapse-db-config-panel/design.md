## Context

El panel de configuración de base de datos en el paso 1 del importador de tiempos ocupa espacio vertical significativo en la interfaz de usuario. Actualmente, este panel siempre se muestra expandido, ocupando valioso espacio de pantalla incluso cuando la configuración ya ha sido guardada y no necesita ser modificada. Esto reduce el espacio disponible para otros elementos de la UI y puede afectar negativamente la experiencia de usuario.

## Goals / Non-Goals

**Goals:**
- Implementar funcionalidad de colapso/expansión para el panel de configuración de base de datos
- El panel debe estar expandido por defecto cuando no existe configuración guardada
- El panel debe estar colapsado por defecto cuando existe configuración guardada
- Mostrar indicador visual del estado de configuración cuando el panel está colapsado
- Persistir el estado de colapso durante la sesión del usuario
- Mantener la funcionalidad existente sin cambios en el comportamiento de guardado

**Non-Goals:**
- Cambiar la lógica de validación de la configuración
- Modificar el proceso de guardado de la configuración
- Implementar persistencia del estado de colapso entre sesiones (solo sesión actual)
- Cambiar el diseño visual del panel cuando está expandido

## Decisions

### 1. Estado inicial del panel basado en configuración existente
**Decision:** El estado inicial (expandido/colapsado) se determina verificando si existe configuración guardada.
**Rationale:** Esto proporciona el mejor UX - los usuarios ven el panel cuando necesitan configurar por primera vez, y lo tienen oculto cuando ya está configurado.
**Alternatives considered:**
- Siempre colapsado: Mala UX para primera configuración
- Siempre expandido: No resuelve el problema original
- Persistir preferencia del usuario: Más complejo, no justificado para este caso

### 2. Estado de colapso manejado localmente en el componente
**Decision:** Usar estado local (useState) para manejar el estado de colapso del panel.
**Rationale:** Es suficiente para esta funcionalidad. No requiere estado global ni persistencia entre sesiones.
**Alternatives considered:**
- Estado global (Redux/Context): Overkill para este caso
- Persistencia en localStorage: No necesario, preferible recalcular cada sesión

### 3. Indicador visual simple en estado colapsado
**Decision:** Mostrar un badge o texto que indique "Configurado" cuando el panel está colapsado y existe configuración.
**Rationale:** Permite al usuario saber rápidamente que hay configuración guardada sin expandir el panel.
**Alternatives considered:**
- Preview parcial de la configuración: Demasiado complejo
- Solo icono: Menos claro que un texto/badge

### 4. Botón de colapso/expansión con icono estándar
**Decision:** Usar iconos estándar de flecha arriba/abajo o chevron para el botón de colapso.
**Rationale:** Iconos reconocibles universalmente, consistentes con patrones de UI comunes.

## Risks / Trade-offs

**[Risk]** Usuarios pueden no notar que el panel está colapsado y pensar que falta la configuración.
**→ Mitigation:** Implementar indicador visual claro (badge/texto) y asegurar que el botón de expansión sea prominente.

**[Risk]** Estado inicial incorrecto si la verificación de configuración es asíncrona.
**→ Mitigation:** Manejar estado de carga apropiadamente, posiblemente mostrar skeleton o mantener expandido hasta que se confirme el estado.

**[Risk]** Inconsistencia visual con otros paneles si no hay patrón establecido.
**→ Mitigation:** Seguir patrones de UI existentes en la aplicación para colapsables.

## Migration Plan

No requiere migración de datos. Es un cambio puramente de UI que no afecta datos persistentes.

Pasos de despliegue:
1. Implementar cambios en componente del paso 1
2. Verificar comportamiento con configuración existente
3. Verificar comportamiento sin configuración
4. Ejecutar tests existentes para asegurar no hay regressions

## Open Questions

- ¿Existe algún patrón de colapsable ya implementado en otros componentes de la aplicación que debería seguir?
- ¿Se debe animar la transición de colapso/expansión?
