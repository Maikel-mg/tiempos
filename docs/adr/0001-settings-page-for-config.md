# 0001 — Settings page dedicada para configuración

La configuración de la app (DB connection, usuario, tipoHora, fase) estaba dispersa en componentes inline dentro de los wizards (DBConnection en ImportCsvPage, ImportConfigPanel en LiveTimeEntriesPage). Se decidió centralizarla en una página `/settings` dedicada con un info bar de solo lectura en las páginas que la consumen.

## Contexto

- DBConnection era un card colapsable en ImportCsvPage Step 1
- ImportConfigPanel era un formulario editable en LiveTimeEntriesPage
- No había una ubicación clara para "dónde va a configurar esto el usuario"
- La config se guardaba en localStorage via ConfigStore (ya existente)

## Decisiones

1. **Página `/settings`** con dos secciones independientes (DB + Wizard), cada una con su propio botón guardar
2. **Info bar de solo lectura** en LiveTimeEntriesPage e ImportCsvPage, con link a Settings
3. **Guard pattern** en "Ejecutar en BD" (no en carga de página) — permite explorar datos sin config
4. **Fase contextual** — en Settings muestra valor actual, en LiveTimeEntriesPage muestra hint mensual con "Aplicar sugerencia"
5. **ImportCsvPage deprecated** — info bar read-only, sin edición inline
6. **Seguir arquitectura** — nuevos endpoints usan apiClient + React Query (mutations existentes en sql-mutations.ts)

## Alternativas rechazadas

- **Modal/Dialog** — demasiado compacto para 4 campos de DB + password
- **Accordion inline** — esconde config, difícil de descubrir
- **Auto-save** — riesgoso para credenciales de DB
- **Redirect a Settings si falta config** — bloquea exploración de datos de Clockify
