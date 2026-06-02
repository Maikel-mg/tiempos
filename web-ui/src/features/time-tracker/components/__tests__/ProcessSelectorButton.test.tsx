import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { ProcessSelectorButton } from '../ProcessSelectorButton';
import type { Proceso } from '../../types';

// ── Test data ────────────────────────────────────────────────────────────────

const MOCK_API_RESPONSE = {
  success: true,
  data: {
    cliente: { CodCli: 1, Cliente: 'CLI001', NomCliente: 'Acme Corp' },
    proyecto: { CodCli: 1, Proyecto: 100, NomProy: 'Proyecto Alpha', Cerrado: false, CMMI: false, EsCM: false, EsPET: false },
    disciplinas: [
      {
        idDisciplina: 1,
        nombre: 'Desarrollo',
        sinDisciplina: false,
        orden: 1,
        fases: [
          {
            fase: 10,
            nombre: 'Fase Construcción',
            cerrado: false,
            orden: 1,
            procesos: [
              { proceso: 101, nombre: 'Desarrollo Frontend' },
              { proceso: 102, nombre: 'Desarrollo Backend' },
            ],
          },
          {
            fase: 20,
            nombre: 'Fase Testing',
            cerrado: false,
            orden: 2,
            procesos: [
              { proceso: 201, nombre: 'Testing Unitario' },
            ],
          },
        ],
      },
    ],
  },
};

const SEED_PROCESSES: Proceso[] = [
  { proceso: 101, nombre: 'Desarrollo Frontend', faseNombre: 'Fase Construcción', proyectoNombre: 'Proyecto Alpha', clienteNombre: 'Acme Corp' },
  { proceso: 102, nombre: 'Desarrollo Backend', faseNombre: 'Fase Construcción', proyectoNombre: 'Proyecto Alpha', clienteNombre: 'Acme Corp' },
  { proceso: 201, nombre: 'Testing Unitario', faseNombre: 'Fase Testing', proyectoNombre: 'Proyecto Alpha', clienteNombre: 'Acme Corp' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const DB_NAME = 'ProcessSelectorButtonTestDB';

function deleteDB() {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

function createTestDB() {
  const db = new Dexie(DB_NAME);
  db.version(1).stores({
    processes: 'proceso, nombre, faseNombre, proyectoNombre, clienteNombre',
    processRecents: 'proceso, lastUsedAt',
  });
  return db;
}

function createMockApiClient(response: unknown) {
  return { post: vi.fn().mockResolvedValue(response) };
}

async function seedProcesses(db: Dexie, processes: Proceso[]) {
  await db.table('processes').bulkPut(processes);
}

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ProcessSelectorButton', () => {
  beforeEach(async () => {
    await deleteDB();
  });

  it('renders button with placeholder text when no process selected', async () => {
    const db = createTestDB();
    const apiClient = createMockApiClient(MOCK_API_RESPONSE);
    const onChange = vi.fn();

    renderWithQuery(
      <ProcessSelectorButton
        value={null}
        onChange={onChange}
        db={db as any}
        apiClient={apiClient as any}
      />
    );

    expect(screen.getByRole('button', { name: /seleccionar proceso/i })).toBeInTheDocument();
    db.close();
  });

  it('renders button with selected process name', async () => {
    const db = createTestDB();
    const apiClient = createMockApiClient(MOCK_API_RESPONSE);
    const onChange = vi.fn();
    const selectedProcess: Proceso = { proceso: 101, nombre: 'Desarrollo Frontend' };

    renderWithQuery(
      <ProcessSelectorButton
        value={selectedProcess}
        onChange={onChange}
        db={db as any}
        apiClient={apiClient as any}
      />
    );

    expect(screen.getByRole('button', { name: /desarrollo frontend/i })).toBeInTheDocument();
    db.close();
  });

  it('opens popover and shows processes from IndexedDB', async () => {
    const user = userEvent.setup();
    const db = createTestDB();
    await seedProcesses(db, SEED_PROCESSES);
    const apiClient = createMockApiClient(MOCK_API_RESPONSE);
    const onChange = vi.fn();
    const onCreateNew = vi.fn();

    renderWithQuery(
      <ProcessSelectorButton
        value={null}
        onChange={onChange}
        db={db as any}
        apiClient={apiClient as any}
        onCreateNew={onCreateNew}
      />
    );

    await user.click(screen.getByRole('button', { name: /seleccionar proceso/i }));

    await waitFor(() => {
      expect(screen.getByText('Desarrollo Frontend')).toBeInTheDocument();
    });

    expect(screen.getByText('Desarrollo Backend')).toBeInTheDocument();
    expect(screen.getByText('Testing Unitario')).toBeInTheDocument();
    expect(screen.getByText('Todos')).toBeInTheDocument();
    expect(screen.getByText('Crear')).toBeInTheDocument();
    db.close();
  });

  it('filters processes by search text', async () => {
    const user = userEvent.setup();
    const db = createTestDB();
    await seedProcesses(db, SEED_PROCESSES);
    const apiClient = createMockApiClient(MOCK_API_RESPONSE);
    const onChange = vi.fn();

    renderWithQuery(
      <ProcessSelectorButton
        value={null}
        onChange={onChange}
        db={db as any}
        apiClient={apiClient as any}
      />
    );

    await user.click(screen.getByRole('button', { name: /seleccionar proceso/i }));

    await waitFor(() => {
      expect(screen.getByText('Desarrollo Frontend')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/buscar por nombre/i);
    await user.type(searchInput, 'frontend');

    await waitFor(() => {
      expect(screen.getByText('Desarrollo Frontend')).toBeInTheDocument();
    });

    expect(screen.queryByText('Desarrollo Backend')).not.toBeInTheDocument();
    expect(screen.queryByText('Testing Unitario')).not.toBeInTheDocument();
    db.close();
  });

  it('selects a process and calls onChange', async () => {
    const user = userEvent.setup();
    const db = createTestDB();
    await seedProcesses(db, SEED_PROCESSES);
    const apiClient = createMockApiClient(MOCK_API_RESPONSE);
    const onChange = vi.fn();

    renderWithQuery(
      <ProcessSelectorButton
        value={null}
        onChange={onChange}
        db={db as any}
        apiClient={apiClient as any}
      />
    );

    await user.click(screen.getByRole('button', { name: /seleccionar proceso/i }));

    await waitFor(() => {
      expect(screen.getByText('Desarrollo Frontend')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Desarrollo Frontend'));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ proceso: 101, nombre: 'Desarrollo Frontend' })
      );
    });
    db.close();
  });

  it('renders in disabled state', async () => {
    const db = createTestDB();
    const apiClient = createMockApiClient(MOCK_API_RESPONSE);
    const onChange = vi.fn();

    renderWithQuery(
      <ProcessSelectorButton
        value={null}
        onChange={onChange}
        db={db as any}
        apiClient={apiClient as any}
        disabled
      />
    );

    const button = screen.getByRole('button', { name: /seleccionar proceso/i });
    expect(button).toBeDisabled();
    db.close();
  });

  it('calls onCreateNew when create button is clicked', async () => {
    const user = userEvent.setup();
    const db = createTestDB();
    const apiClient = createMockApiClient(MOCK_API_RESPONSE);
    const onChange = vi.fn();
    const onCreateNew = vi.fn();

    renderWithQuery(
      <ProcessSelectorButton
        value={null}
        onChange={onChange}
        db={db as any}
        apiClient={apiClient as any}
        onCreateNew={onCreateNew}
      />
    );

    await user.click(screen.getByRole('button', { name: /seleccionar proceso/i }));

    await waitFor(() => {
      expect(screen.getByText('Crear')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Crear'));

    expect(onCreateNew).toHaveBeenCalled();
    db.close();
  });
});
