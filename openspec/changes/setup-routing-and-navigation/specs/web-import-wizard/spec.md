## MODIFIED Requirements

### Requirement: Wizard permite navegación entre pasos
El sistema SHALL permitir al usuario navegar hacia adelante y atrás entre los pasos del wizard, y SHALL incluir una opción para volver a la pantalla de inicio principal.

#### Scenario: Navegación hacia adelante
- **WHEN** el usuario completa un paso y hace clic en "Continuar"
- **THEN** el sistema avanza al siguiente paso
- **AND** el sistema actualiza el indicador de progreso del wizard
- **AND** el paso anterior queda marcado como completado

#### Scenario: Navegación hacia atrás
- **WHEN** el usuario hace clic en "Volver"
- **THEN** el sistema regresa al paso anterior
- **AND** el sistema preserva los datos ingresados en el paso actual
- **AND** el usuario puede modificar datos y volver a avanzar

#### Scenario: Volver al menú principal
- **WHEN** el usuario está en cualquier paso del wizard y desea cancelar el proceso
- **THEN** el sistema SHALL mostrar un botón o enlace de "Volver al Inicio"
- **AND** al hacer clic, SHALL navegar a la ruta raíz `/`

#### Scenario: Indicador de progreso visual
- **WHEN** el usuario está en la ruta `/import`
- **THEN** el sistema muestra indicador de progreso con 3 pasos: "1. Subir CSV", "2. Asignar IDs", "3. Generar SQL"
- **AND** el paso actual está resaltado visualmente
- **AND** los pasos completados muestran checkmark o indicador visual
