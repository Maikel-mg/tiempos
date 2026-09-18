# Importador de Tiempos - Web UI

Herramienta web para registrar tiempos con un temporizador interno y generar/ejecutar SQL en SQL Server mediante procedimiento almacenado.

## Interfaz Web

La aplicación web proporciona una interfaz gráfica para registrar tiempos, consultarlos en un dashboard y sincronizarlos con SQL Server.

### Iniciar interfaz web

```bash
npm run web
```

Esto abrirá un servidor de desarrollo en `http://localhost:5173`.

### Backend

El servidor backend proporciona API endpoints para la web UI:

```bash
npm run start
```

Para desarrollo con recarga automática:

```bash
npm run dev-backend
```

### Características de la Web UI

- Temporizador interno y registro manual de tiempos
- Persistencia local de registros en IndexedDB
- Sincronización de registros con SQL Server
- Dashboard con resumen de horas y desglose por tarea
- Gestión de proyectos y tareas
- Tema claro/oscuro y diseño responsive

Para más detalles, ver [web-ui/README.md](web-ui/README.md).

## Ejemplo de Uso

1. Inicia la web UI: `npm run web`
2. Navega a `http://localhost:5173`
3. Configura la conexión a SQL Server en `/settings`
4. Registra tiempos con el temporizador interno
5. Sincroniza los registros con la base de datos

## Notas

- Los registros se guardan en el navegador (IndexedDB) hasta que se sincronizan
- Requiere Node.js 18+ para ejecutar el servidor backend
- Web UI usa React 18 + Vite 5 + TailwindCSS
