# Web UI - Estándares de Arquitectura

Documento de referencia para el desarrollo de nuevas features en la capa frontend.

---

## Stack

| Paquete | Uso |
|---------|-----|
| React 18 + TypeScript | Framework UI |
| Vite | Bundler / Dev server |
| TailwindCSS + shadcn/ui | Estilos y componentes |
| TanStack Query v5 | Estado de datos (caché, loading, error) |
| React Router v7 | Navegación |
| Axios | Cliente HTTP centralizado |
| Vitest + Testing Library | Testing |
| Sonner | Notificaciones toast |

---

## Estructura de proyecto

```
src/
  lib/
    api/client.ts          # ApiClient centralizado (axios wrapper)
    types.ts              # Tipos globales compartidos
    csv-parser.ts         # Utilidad de parsing CSV
    sql-generator/        # Generador de SQL
    task-mapping-storage.ts
    utils.ts
  features/               # Features organizadas por dominio
    [feature-name]/
      components/         # Componentes UI específicos de la feature
      hooks/              # Hooks de lógica de negocio
      queries/            # Definición de queries (React Query)
      mutations/          # Definición de mutations (React Query)
      ports.ts            # Interfaces (contratos)
      adapters.ts         # Implementaciones concretas
      index.ts            # Export público
  components/ui/          # Componentes shadcn/ui genéricos
  pages/                 # Páginas (composición de features)
  styles/                 # CSS global y variables Tailwind
```

---

## ApiClient (`lib/api/client.ts`)

Todas las llamadas HTTP al backend pasan por el `ApiClient`:

```typescript
import { apiClient } from '@/lib/api/client';

// GET
const result = await apiClient.get<MiTipo>('/mi-endpoint');
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.message);
}

// POST
const result = await apiClient.post<MiRespuesta>('/mi-endpoint', { foo: 'bar' });
```

**Reglas:**
- Nunca usar `fetch` directo en componentes ni hooks
- Todos los endpoints van por `apiClient`
- El ApiClient maneja timeouts (30s), errores, y interceptores

---

## React Query: Queries y Mutations

### Queries (`features/[feature]/queries/`)

```typescript
// features/mi-feature/queries/mi-feature-queries.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export function useMiQuery(params: MiParams) {
  return useQuery<MiRespuesta, Error>({
    queryKey: ['mi-feature', params.id],
    queryFn: async () => {
      const result = await apiClient.get<MiRespuesta>(`/endpoint/${params.id}`);
      if (result.success) return result.data;
      throw new Error(result.message);
    },
    staleTime: 5 * 60 * 1000,
    retry: 1
  });
}
```

### Mutations (`features/[feature]/mutations/`)

```typescript
// features/mi-feature/mutations/mi-feature-mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export function useMiMutation() {
  const queryClient = useQueryClient();
  return useMutation<MiRespuesta, Error, MiPayload>({
    mutationFn: async (payload) => {
      const result = await apiClient.post<MiRespuesta>('/endpoint', payload);
      if (result.success) return result.data;
      throw new Error(result.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mi-feature'] });
    }
  });
}
```

---

## Convenciones de código

### Tipos

- `any` **prohibido** — siempre tipar completamente
- Los tipos de API van en `lib/types.ts` o en `features/[feature]/types.ts`
- Crear interfaces para `Request` y `Response` de cada endpoint

### Nomenclatura

| Elemento | Formato | Ejemplo |
|----------|---------|---------|
| Archivos | kebab-case | `mi-feature-queries.ts` |
| Componentes React | PascalCase | `MiComponente.tsx` |
| Hooks | camelCase + prefijo `use` | `useMiFeatureData.ts` |
| Interfaces | PascalCase con prefijo descriptivo | `MiFeatureParams` |

### Separación de responsabilidades

- **Componentes**: UI pura, sin lógica de negocio. Reciben props y callbacks.
- **Hooks**: Lógica de estado y coordinación. Usan React Query internamente.
- **Queries/Mutations**: Definición de llamadas API con TanStack Query.
- **Ports & Adapters**: Para lógica que no necesita red (ej: parsing CSV), usar el patrón de ports con interfaces en `ports.ts` e implementaciones en `adapters.ts`.

### Límite de tamaño

- Máximo **150 líneas** por archivo de componente/hook
- Si se excede, extraer subcomponentes o mover lógica a hooks/adaptadores

### Estado local

- Usar `useState` / `useReducer` para estado de UI
- Usar `useQuery` / `useMutation` para estado de datos async
- No mezclar responsabilidades

---

## Flujo para crear una nueva feature

1. **Tipos** — Definir interfaces en `lib/types.ts` o `features/[name]/types.ts`
2. **ApiClient** — Añadir query/mutation usando `apiClient`
3. **Hooks** — Crear hook que orqueste la lógica y use React Query
4. **Componentes** — Construir UI siguiendo la estructura modular
5. **Integración** — Componer en la página correspondiente
6. **Verificación** — Comprobar que el código compila sin errores

---

## Rutas

Las rutas se configuran en `App.tsx` con React Router. Registrar nuevas páginas en la lista de rutas.

---

## Manejo de errores

### Tipos de error

| Tipo | Componente | Uso |
|------|------------|-----|
| Error de API | `Alert` + `ApiError` | Fallos en llamadas al backend |
| Error de validación | `Alert` + `Badge` | Validaciones de formulario en tiempo real |
| Notificación | `sonner` toast | Feedback de acciones (éxito/error transitorio) |
| Error global | `ErrorBoundary` | Errores críticos que rompen la UI |

### Patrón con ApiClient

El `ApiClient` devuelve `ApiResponse<T>` con discriminante `success`:

```typescript
const result = await apiClient.get<MiTipo>('/endpoint');
if (result.success) {
  setData(result.data);
} else {
  setError(result.message);
}
```

### Alert inline (errores persistentes)

Usar `Alert` para errores que requieren atención del usuario:

```tsx
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

// Error crítico
<Alert variant="destructive">
  <AlertCircle className="w-4 h-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>{error}</AlertDescription>
</Alert>

// Advertencia
<Alert variant="warning">
  <AlertTriangle className="w-4 h-4" />
  <AlertTitle>Atención</AlertTitle>
  <AlertDescription>...</AlertDescription>
</Alert>

// Éxito persistente
<Alert variant="success">
  <CheckCircle className="w-4 h-4" />
  <AlertTitle>Completado</AlertTitle>
  <AlertDescription>...</AlertDescription>
</Alert>
```

### Toast con Sonner (notificaciones transitorias)

Instalar: `npm install sonner`

Usar para feedback de acciones que no requieren interacción:

```tsx
// En App.tsx o layout principal
import { Toaster } from 'sonner';

// En el root del componente
<Toaster position="top-right" richColors />

// En hooks/componentes
import { toast } from 'sonner';

// Éxito
toast.success('Registro guardado correctamente');

// Error
toast.error('No se pudo conectar con el servidor');

// Con acción
toast.error('Error al guardar', {
  action: { label: 'Reintentar', onClick: () => refetch() }
});
```

### ErrorBoundary global

Captura errores de React que rompen el árbol de componentes:

```tsx
// components/ErrorBoundary.tsx
import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <h1 className="text-2xl font-bold text-destructive mb-4">
            Algo salió mal
          </h1>
          <p className="text-muted-foreground mb-6">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded"
          >
            Recargar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

Uso en `main.tsx` o `App.tsx`:

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### Reglas

1. **Nunca usar `alert()` del browser**
2. **Errores de API**: manejar con `if (!result.success)` y mostrar en `Alert`
3. **Errores de validación**: mostrar inline con `Badge` o texto rojo
4. **Notificaciones transitorias**: usar `sonner` (toast.success/toast.error)
5. **Errores persistentes**: usar `Alert` inline
6. **Loguear errores**: usar `console.error()` para debugging, nunca mostrar trazas al usuario
7. **Estados de error**: usar `useState<string | null>(null)` y limpiar al reintentar

### Cuándo usar cada uno

| Situación | Usar |
|-----------|------|
| Error al cargar datos (página) | `Alert` inline |
| Error al enviar formulario | `Alert` inline + toast si hay reintentar |
| Acción exitosa (guardar, eliminar) | `toast.success` |
| Error de red transitorio | `toast.error` con acción "Reintentar" |
| Validación en tiempo real | `Badge` o texto inline |
| Crash de componente | `ErrorBoundary` |
