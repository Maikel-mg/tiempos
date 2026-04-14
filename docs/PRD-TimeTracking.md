# PRD - Sistema de Registro de Tiempos

## 1. Resumen Ejecutivo

Este documento describe los requisitos para reemplazar Clockify por un sistema de registro de tiempos integrado en la aplicación web existente. El nuevo sistema permitirá a los usuarios registrar tiempo sobre tareas existentes de la aplicación mediante entrada manual o temporizador, con persistencia local y sincronización dual (SQL manual o automática) hacia la base de datos de la empresa.

## 2. Contexto del Proyecto

### Situación Actual
- El usuario utiliza **Clockify** como herramienta de terceros para registrar tiempos
- Los registros se visualizan en `LiveTimeEntriesPage.tsx`
- La sincronización con la BBDD empresarial se realiza mediante generación de SQL
- Los procesos/tareas se gestionan en la aplicación actual

### Objetivo
Reemplazar la funcionalidad de Clockify por un sistema interno con:
- Entrada manual de hora de entrada/salida
- Temporizador con estado persistente en IndexedDB
- Sincronización dual: SQL manual o automática
- Arquitectura que permita cambiar el almacenamiento (plugin/estrategia)

### Restricciones
- Mantener Clockify existente sin cambios (solo lectura/históricos)
- Un solo usuario
- Solo acceso web
- No requiere exportación a CSV/Excel

---

## 3. Requisitos Funcionales

### 3.1 Gestión de Tareas/Procesos

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-01 | Listar las tareas/procesos existentes de la aplicación | Mandatory |
| RF-02 | Permitir filtrar tareas por nombre, proyecto o estado | Mandatory |
| RF-03 | Mostrar solo las tareas activas para selección | Mandatory |

### 3.2 Registro de Tiempo - Entrada Manual

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-04 | Seleccionar tarea de la lista de procesos activos | Mandatory |
| RF-05 | Introducir hora de entrada (formato HH:MM) | Mandatory |
| RF-06 | Introducir hora de salida (formato HH:MM) | Mandatory |
| RF-07 | Seleccionar fecha del registro | Mandatory |
| RF-08 | Añadir descripción opcional al registro | Optional |
| RF-09 | Calcular duración automáticamente (salida - entrada) | Mandatory |
| RF-10 | Validar que hora de salida > hora de entrada | Mandatory |
| RF-11 | Guardar registro en IndexedDB | Mandatory |

### 3.3 Registro de Tiempo - Temporizador

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-12 | Seleccionar tarea antes de iniciar temporizador | Mandatory |
| RF-13 | Botón "Start" para iniciar conteo | Mandatory |
| RF-14 | Mostrar tiempo transcurrido en tiempo real (HH:MM:SS) | Mandatory |
| RF-15 | Estado "running" persists en IndexedDB | Mandatory |
| RF-16 | Al reopen del navegador, recuperar estado del temporizador y continuar | Mandatory |
| RF-17 | Botón "Stop" para detener y generar registro | Mandatory |
| RF-18 | Al hacer stop, generar registro con hora actual como salida | Mandatory |
| RF-19 | Solo un temporizador activo a la vez | Mandatory |

### 3.4 Listado de Registros

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-20 | Mostrar lista de registros del mes actual por defecto | Mandatory |
| RF-21 | Filtrar por rango de fechas | Mandatory |
| RF-22 | Filtrar por tarea/proceso | Optional |
| RF-23 | Ordenar por fecha, duración o tarea | Mandatory |
| RF-24 | Seleccionar registros para generar SQL | Mandatory |
| RF-25 | Indicador visual de registros ya sincronizados | Mandatory |
| RF-26 | Ocultar registros ya creados en BBDD (toggle) | Mandatory |

### 3.5 Sincronización con BBDD

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-27 | Generar SQL para registros seleccionados (formato actual) | Mandatory |
| RF-28 | Copiar SQL al portapapeles | Mandatory |
| RF-29 | Descargar SQL como archivo .sql | Mandatory |
| RF-30 | Ejecutar SQL directamente en BBDD (botón) | Mandatory |
| RF-31 | Ejecutar automáticamente al hacer stop del temporizador | Mandatory |
| RF-32 | Marcar registros como "sincronizados" tras ejecución exitosa | Mandatory |

### 3.6 Manejo de Conflictos

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RF-33 | Permitir registros con horario solapado | Mandatory |
| RF-34 | Mostrar alerta visual cuando existe solapamiento | Mandatory |
| RF-35 | La alerta debe mostrar qué registros se solapan | Mandatory |

---

## 4. Requisitos No Funcionales

### 4.1 Arquitectura

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RNF-01 | Sistema de almacenamiento abstracto (patrón Strategy) | Mandatory |
| RNF-02 | Implementación por defecto: IndexedDB | Mandatory |
| RNF-03 | Posibilidad de cambiar implementación sin modificar lógica de negocio | Mandatory |
| RNF-04 | Código modular y extensible | Mandatory |

### 4.2 Persistencia

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RNF-05 | Persistencia de registros en IndexedDB | Mandatory |
| RNF-06 | Persistencia de estado del temporizador en IndexedDB | Mandatory |
| RNF-07 | Recuperación automática del estado al reopen | Mandatory |
| RNF-08 | Datos survive al cierre del navegador | Mandatory |

### 4.3 UX/UI

| ID | Requisito | Prioridad |
|----|-----------|-----------|
| RNF-09 | Interfaz intuitiva similar a Clockify | Mandatory |
| RNF-10 | Feedback visual durante temporización | Mandatory |
| RNF-11 | Diseño coherente con el resto de la aplicación | Mandatory |
| RNF-12 | Tiempos de respuesta < 200ms | Mandatory |

---

## 5. Modelo de Datos

### 5.1 TimeEntry (Registro de Tiempo)

```typescript
interface TimeEntry {
  id: string;                    // UUID único
  taskId: string;                // ID del proceso/tarea
  taskName: string;              // Nombre de la tarea
  date: string;                  // Fecha (YYYY-MM-DD)
  startTime: string;             // Hora inicio (HH:MM)
  endTime: string;               // Hora fin (HH:MM)
  duration: number;              // Duración en segundos
  description?: string;         // Descripción opcional
  createdAt: string;            // Timestamp creación
  updatedAt: string;            // Timestamp última modificación
  synced: boolean;              // Si está sincronizado con BBDD
  syncedAt?: string;            // Timestamp sincronización
}
```

### 5.2 TimerState (Estado del Temporizador)

```typescript
interface TimerState {
  isRunning: boolean;
  taskId: string;
  taskName: string;
  startTime: string;             // ISO timestamp
  elapsed: number;               // Segundos acumulados
}
```

### 5.3 Task (Proceso/Tarea)

```typescript
interface Task {
  id: string;
  name: string;
  project?: string;
  active: boolean;
}
```

---

## 6. Arquitectura del Sistema

### 6.1 Patrón Strategy para Almacenamiento

```
┌─────────────────────────────────────────────────────┐
│                    UI Components                     │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              TimeTrackingService                     │
│  (Lógica de negocio: CRUD, timer, sincronización)   │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              StorageStrategy (Interfaz)              │
│           + save(), get(), update(), delete()       │
└─────────────────────────────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
┌─────────────────────┐   ┌─────────────────────────┐
│ IndexedDBStorage    │   │ Future: RemoteStorage   │
│ (Por defecto)       │   │ (API, Firebase, etc)    │
└─────────────────────┘   └─────────────────────────┘
```

### 6.2 Módulos Propuestos

| Módulo | Responsabilidad |
|--------|-----------------|
| `services/timeTrackingService.ts` | Lógica de negocio principal |
| `storage/StorageStrategy.ts` | Interfaz abstracta |
| `storage/IndexedDBStorage.ts` | Implementación IndexedDB |
| `components/Timer/` | Componentes del temporizador |
| `components/TimeEntryList/` | Listado de registros |
| `components/TimeEntryForm/` | Formulario de entrada manual |
| `hooks/useTimer.ts` | Lógica del temporizador (React) |
| `hooks/useTimeEntries.ts` | CRUD de registros (React) |

---

## 7. Flujos de Usuario

### 7.1 Flujo: Entrada Manual

```
1. Usuario hace clic en "Nuevo Registro"
2. Sistema muestra formulario con:
   - Selector de tarea (dropdown searchable)
   - Fecha (default: hoy)
   - Hora inicio (input HH:MM)
   - Hora salida (input HH:MM)
   - Descripción (opcional)
3. Usuario selecciona tarea y introduce horas
4. Sistema calcula duración automáticamente
5. Usuario hace clic en "Guardar"
6. Sistema valida datos y guarda en IndexedDB
7. Sistema muestra registro en el listado
```

### 7.2 Flujo: Temporizador

```
1. Usuario selecciona tarea de la lista activa
2. Usuario hace clic en "Start"
3. Sistema:
   - Guarda estado en IndexedDB (taskId, startTime)
   - Muestra timer corriendo (actualiza cada segundo)
   - Deshabilita selector de tarea
4. [Usuario puede cerrar navegador]
5. [Al reopen, sistema detecta timer activo y recupera estado]
6. Usuario hace clic en "Stop"
7. Sistema:
   - Genera TimeEntry con hora actual como endTime
   - Guarda en IndexedDB
   - Si está habilitada sincronización automática → ejecuta en BBDD
   - Limpia estado del timer
8. Sistema muestra nuevo registro en listado
```

### 7.3 Flujo: Sincronización SQL

```
1. Usuario selecciona registros del listado
2. Sistema genera SQL (usa lógica existente)
3. Usuario puede:
   a) Copiar SQL al portapapeles
   b) Descargar archivo .sql
   c) Ejecutar directamente (si hay conexión BBDD)
4. Si ejecuta directamente:
   a) Backend ejecuta SQL en BBDD empresa
   b) Sistema marca registros como synced=true
   c) Actualiza indicador visual en listado
```

---

## 8. Integración con Componentes Existentes

### 8.1 Reutilización

| Componente | Reutilizar | Modificaciones |
|-------------|------------|----------------|
| `sql-generator.ts` | ✅ Sí | No requiere cambios |
| `ProcessMappingTable` | ✅ Sí | Añadir como fuente de tareas |
| `ImportConfigPanel` | ✅ Sí | Reutilizar configuración (usuario, fase, tipoHora) |
| `DBConnection` | ✅ Sí | Para ejecución automática de SQL |
| `LiveTimeEntriesPage` | ⚠️ Parcial | Mantener para Clockify, crear nueva página para sistema interno |

### 8.2 Nueva Página Propuesta

- Nombre: `TimeTrackingPage.tsx` o similar
- Ubicación: `web-ui/src/pages/`
- Reemplaza funcionalmente a Clockify para creación de registros
- Convive con `LiveTimeEntriesPage` (mantener Clockify)

---

## 9. Consideraciones Técnicas

### 9.1 IndexedDB

- Usar biblioteca wrapper: `idb` o `dexie` (sugerido: **Dexie.js** por simplicidad)
- Stores necesarios:
  - `timeEntries`: Registros de tiempo
  - `timerState`: Estado del temporizador
  - `tasks`: Caché de tareas (opcional)

### 9.2 Sincronización con Clockify

- Mantener `LiveTimeEntriesPage` intacta
- Nueva página solo para el sistema interno
- No hay migración de datos de Clockify necesaria

### 9.3 Validaciones

| Validación | Tipo | Acción |
|------------|------|--------|
| Hora salida > hora inicio | Frontend | Mostrar error, no guardar |
| Campos obligatorios | Frontend | Deshabilitar botón guardar |
| Conexión BBDD | Backend | Mostrar error si no hay config |
| Registro duplicado | Frontend | Advertencia (misma tarea + fecha + horas) |

---

## 10. Funcionalidades Futuras (Out of Scope)

Las siguientes funcionalidades no están en este PRD pero pueden considerarse en versiones posteriores:

- [ ] Multi-usuario (sincronización entre dispositivos)
- [ ] Exportación a CSV/Excel
- [ ] Integración con otras APIs (otras herramientas de tiempo)
- [ ] App móvil nativa
- [ ] Notificaciones/reminders
- [ ] Informes y estadísticas
- [ ] Sincronización bidireccional con BBDD (leer registros existentes)

---

## 11. Criterios de Éxito

El sistema se considerará funcional cuando:

1. ✅ Un usuario pueda registrar tiempo manualmente (entrada/salida)
2. ✅ Un usuario pueda usar el temporizador (start/stop)
3. ✅ Los registros persistan en IndexedDB y se recuperen al reopen del navegador
4. ✅ Se pueda generar SQL para registros seleccionados
5. ✅ Se pueda ejecutar SQL directamente en la BBDD empresarial
6. ✅ El sistema permita cambiar la implementación de almacenamiento sin modificar lógica de negocio
7. ✅ Se muestren alertas visuales ante registros solapados

---

## 12. Estimación de Esfuerzo

| Fase | Estimación |
|------|------------|
| Diseño técnico + arquitectura | 1-2 días |
| Implementación almacenamiento (IndexedDB + Strategy) | 2-3 días |
| Componentes UI (formulario, timer, listado) | 3-4 días |
| Integración con sistema SQL existente | 1-2 días |
| Testing y ajustes | 1-2 días |
| **Total** | **8-13 días** |

---

## 13. Decisiones de Diseño

| Decisión | Respuesta |
|----------|-----------|
| Navegación | Nueva ruta en el menú lateral |
| Nombre de la funcionalidad | "Mi TimeTracker" |
| Sincronización automática por defecto | Desactivada (el usuario debe activarla manualmente) |
| Alertas de solapamiento | Siempre visibles (no requieren selección) |

---

## 14. Rutas y Componentes

### 14.1 Nueva Ruta

- **Path**: `/time-tracker`
- **Nombre en menú**: "Mi TimeTracker"
- **Icono**: Clock o Timer (lucide-react)

### 14.2 Componentes de la Página

```
src/pages/
└── TimeTrackingPage.tsx        # Página principal

src/features/time-tracker/
├── components/
│   ├── TimerWidget.tsx          # Widget del temporizador (Start/Stop)
│   ├── TimeEntryForm.tsx       # Formulario de entrada manual
│   ├── TimeEntryList.tsx      # Listado de registros
│   └── OverlapAlert.tsx        # Alerta de solapamiento
├── hooks/
│   ├── useTimer.ts             # Lógica del temporizador
│   └── useTimeEntries.ts       # CRUD de registros
└── services/
    └── timeTrackingService.ts  # Lógica de negocio

src/lib/storage/
├── StorageStrategy.ts          # Interfaz abstracta
└── IndexedDBStorage.ts         # Implementación IndexedDB
```

---

*Documento generado para revisión y posteriores fases de implementación.*