# Editor de registros separado del Timer activo

El `Editor de registros` se implementará como un diálogo centrado y reutilizable para crear y modificar `Registros de tiempo`, separado de `TimeTrackerBar`. `TimeTrackerBar` quedará dedicada al `Timer activo`; abrir, guardar o cancelar el editor no detendrá, reemplazará ni modificará el timer. La primera integración mantendrá el estado y la persistencia en `TimeTrackingPage`, dejando la extracción preparada para futuras invocaciones desde otras pantallas y atajos globales.

## Decisiones

- El diálogo reutiliza el formulario manual y sus validaciones actuales.
- Crear y editar usan el mismo editor, con acciones y título adaptados al modo.
- Los registros sincronizados siguen sin poder editarse; se mantiene la opción de duplicarlos.
- El formulario manual se elimina de `TimeTrackerBar` para evitar dos formularios canónicos.
- El editor puede abrirse mientras hay un `Timer activo`; el timer permanece visible detrás y continúa sin cambios.
- Si el formulario tiene cambios sin guardar, cerrar mediante Escape, X o clic exterior pide confirmación.

