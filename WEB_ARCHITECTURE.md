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
