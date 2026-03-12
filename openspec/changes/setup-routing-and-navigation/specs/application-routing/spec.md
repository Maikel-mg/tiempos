## ADDED Requirements

### Requirement: Aplicación utiliza React Router para navegación
El sistema SHALL utilizar `react-router-dom` para gestionar las rutas de la aplicación de forma declarativa.

#### Scenario: Acceso a la ruta raíz
- **WHEN** el usuario accede a la URL base de la aplicación `/`
- **THEN** el sistema SHALL mostrar la página de inicio (Landing Screen)

#### Scenario: Acceso a la ruta de importación
- **WHEN** el usuario accede a la URL `/import`
- **THEN** el sistema SHALL mostrar el wizard de importación de CSV

#### Scenario: Acceso a una ruta no existente
- **WHEN** el usuario accede a una URL que no coincide con ninguna ruta definida
- **THEN** el sistema SHALL redirigir automáticamente a la ruta raíz `/`

### Requirement: Persistencia del estado entre rutas
El sistema SHALL mantener el estado global de la aplicación (como configuración de base de datos) aunque el usuario navegue entre diferentes rutas, siempre que no se recargue la página.

#### Scenario: Navegación preserva configuración de DB
- **WHEN** el usuario configura los datos de conexión a la base de datos en la página de importación
- **AND** navega a la página de inicio
- **AND** vuelve a la página de importación
- **THEN** los datos de configuración SHALL permanecer completados tal como se dejaron
