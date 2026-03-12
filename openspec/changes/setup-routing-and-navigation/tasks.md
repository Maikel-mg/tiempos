## 1. Preparación y Dependencias

- [x] 1.1 Instalar `react-router-dom` en el directorio `web-ui`
- [x] 1.2 Crear el directorio `web-ui/src/pages` para organizar los componentes de página

## 2. Creación de Componentes de Página

- [x] 2.1 Crear `web-ui/src/pages/HomePage.jsx` con las tarjetas de navegación ("Importar CSV" y "Ver Tiempos en Vivo")
- [x] 2.2 Crear `web-ui/src/pages/ImportCsvPage.jsx` moviendo el contenido del wizard actual desde `App.jsx`
- [x] 2.3 Crear un componente `PlaceholderLivePage.jsx` temporal para la ruta `/live-entries`

## 3. Implementación de Navegación y Routing

- [x] 3.1 Crear `web-ui/src/components/Navigation.jsx` (Header con botón de volver al inicio)
- [x] 3.2 Configurar el `BrowserRouter` en `web-ui/src/main.jsx`
- [x] 3.3 Refactorizar `web-ui/src/App.jsx` para definir las rutas (`/`, `/import`, `/live-entries`)
- [x] 3.4 Asegurar que el estado del wizard y la configuración de DB se pasen correctamente a `ImportCsvPage`

## 4. Verificación y Limpieza

- [x] 4.1 Verificar que la navegación entre páginas no recargue la aplicación
- [x] 4.2 Confirmar que los datos del CSV y la conexión a DB persisten al navegar `Import -> Home -> Import`
- [x] 4.3 Eliminar código muerto o redundante en `App.jsx`
