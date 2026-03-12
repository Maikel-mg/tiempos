## ADDED Requirements

### Requirement: Pantalla de inicio ofrece opciones de funcionalidad
El sistema SHALL presentar una pantalla de inicio con dos opciones principales: "Importar CSV" y "Ver Tiempos en Vivo".

#### Scenario: Visualización inicial de la landing
- **WHEN** el usuario carga la aplicación por primera vez o navega a `/`
- **THEN** el sistema SHALL mostrar un título principal "Importador de Tiempos"
- **AND** SHALL mostrar dos tarjetas interactivas (cards) con iconos descriptivos
- **AND** la tarjeta "Importar CSV" SHALL tener una descripción breve del flujo de importación
- **AND** la tarjeta "Ver Tiempos en Vivo" SHALL tener una descripción breve sobre la visualización de datos de Clockify

#### Scenario: Selección de Importar CSV
- **WHEN** el usuario hace clic en la tarjeta "Importar CSV"
- **THEN** el sistema SHALL navegar a la ruta `/import`

#### Scenario: Selección de Ver Tiempos en Vivo
- **WHEN** el usuario hace clic en la tarjeta "Ver Tiempos en Vivo"
- **THEN** el sistema SHALL navegar a la ruta `/live-entries`

### Requirement: Diseño visual consistente con shadcn/ui
La pantalla de inicio SHALL utilizar los mismos componentes de diseño y paleta de colores que el resto de la aplicación para mantener coherencia visual.

#### Scenario: Uso de componentes UI
- **WHEN** se renderiza la landing screen
- **THEN** el sistema SHALL utilizar componentes `Card` de shadcn/ui para las opciones
- **AND** SHALL utilizar iconos de `lucide-react` para la representación visual
- **AND** el diseño SHALL ser responsivo, adaptando la disposición de las tarjetas según el tamaño de pantalla
