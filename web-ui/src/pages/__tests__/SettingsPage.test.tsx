import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsPage } from '../SettingsPage';
import { dbConfig } from '@/config/stores';
// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock the mutation hook
vi.mock('@/features/live-entries/mutations/sql-mutations', () => ({
  useTestDbConnection: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    data: null,
  })),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderPage = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SettingsPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('SettingsPage - DB Connection Section', () => {
  beforeEach(() => {
    dbConfig.reset();
    vi.clearAllMocks();
  });

  describe('Test 1: Renders 4 form fields', () => {
    it('should render server input with label', () => {
      renderPage();
      expect(screen.getByLabelText(/servidor/i)).toBeDefined();
    });

    it('should render database input with label', () => {
      renderPage();
      expect(screen.getByLabelText(/base de datos/i)).toBeDefined();
    });

    it('should render username input with label', () => {
      renderPage();
      expect(screen.getByLabelText(/usuario/i)).toBeDefined();
    });

    it('should render password input with label', () => {
      renderPage();
      expect(screen.getByLabelText(/contraseña/i)).toBeDefined();
    });
  });

  describe('Test 2: Fields pre-populated from store', () => {
    it('should populate fields when store has saved values', () => {
      dbConfig.set({
        server: 'localhost\\SQLEXPRESS',
        database: 'TiemposDB',
        username: 'sa',
        password: 'secret123',
      });

      renderPage();

      expect((screen.getByLabelText(/servidor/i) as HTMLInputElement).value).toBe('localhost\\SQLEXPRESS');
      expect((screen.getByLabelText(/base de datos/i) as HTMLInputElement).value).toBe('TiemposDB');
      expect((screen.getByLabelText(/usuario/i) as HTMLInputElement).value).toBe('sa');
      expect((screen.getByLabelText(/contraseña/i) as HTMLInputElement).value).toBe('secret123');
    });

    it('should show empty fields when store is empty', () => {
      renderPage();

      expect((screen.getByLabelText(/servidor/i) as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText(/base de datos/i) as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText(/usuario/i) as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText(/contraseña/i) as HTMLInputElement).value).toBe('');
    });
  });

  describe('Test 3: Guardar persists to store', () => {
    it('should persist form values to dbConfig store when Guardar is clicked', () => {
      renderPage();

      fireEvent.change(screen.getByLabelText(/servidor/i), { target: { value: 'my-server' } });
      fireEvent.change(screen.getByLabelText(/base de datos/i), { target: { value: 'my-db' } });
      fireEvent.change(screen.getByLabelText(/usuario/i), { target: { value: 'admin' } });
      fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'pass123' } });

      fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

      const saved = dbConfig.get();
      expect(saved?.server).toBe('my-server');
      expect(saved?.database).toBe('my-db');
      expect(saved?.username).toBe('admin');
      expect(saved?.password).toBe('pass123');
    });
  });

  describe('Test 4: Restablecer reverts to last saved', () => {
    it('should revert form to last saved values when Restablecer is clicked', () => {
      dbConfig.set({
        server: 'saved-server',
        database: 'saved-db',
        username: 'saved-user',
        password: 'saved-pass',
      });

      renderPage();

      // Modify fields
      fireEvent.change(screen.getByLabelText(/servidor/i), { target: { value: 'changed-server' } });
      fireEvent.change(screen.getByLabelText(/base de datos/i), { target: { value: 'changed-db' } });

      // Click Restablecer
      fireEvent.click(screen.getByRole('button', { name: /restablecer/i }));

      // Fields should revert to saved values
      expect((screen.getByLabelText(/servidor/i) as HTMLInputElement).value).toBe('saved-server');
      expect((screen.getByLabelText(/base de datos/i) as HTMLInputElement).value).toBe('saved-db');
      expect((screen.getByLabelText(/usuario/i) as HTMLInputElement).value).toBe('saved-user');
      expect((screen.getByLabelText(/contraseña/i) as HTMLInputElement).value).toBe('saved-pass');
    });
  });

  describe('Test 5: Password show/hide toggle', () => {
    it('should have password type by default', () => {
      renderPage();
      expect((screen.getByLabelText(/contraseña/i) as HTMLInputElement).type).toBe('password');
    });

    it('should toggle to text type when eye button is clicked', () => {
      renderPage();

      const toggleButton = screen.getByRole('button', { name: '' }); // eye icon button
      fireEvent.click(toggleButton);

      expect((screen.getByLabelText(/contraseña/i) as HTMLInputElement).type).toBe('text');
    });
  });

  describe('Test 6: Probar conexión calls mutation', () => {
    it('should call useTestDbConnection mutation with form values', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({ success: true, message: 'OK' });
      vi.mocked(await import('@/features/live-entries/mutations/sql-mutations')).useTestDbConnection.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        isSuccess: false,
        isError: false,
        error: null,
        data: null,
      } as any);

      renderPage();

      fireEvent.change(screen.getByLabelText(/servidor/i), { target: { value: 'my-server' } });
      fireEvent.change(screen.getByLabelText(/base de datos/i), { target: { value: 'my-db' } });
      fireEvent.change(screen.getByLabelText(/usuario/i), { target: { value: 'admin' } });
      fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'pass123' } });

      fireEvent.click(screen.getByRole('button', { name: /probar conexión/i }));

      expect(mockMutateAsync).toHaveBeenCalledWith({
        server: 'my-server',
        database: 'my-db',
        username: 'admin',
        password: 'pass123',
      });
    });
  });

  describe('Test 7: Toast feedback on save', () => {
    it('should show success toast when Guardar is clicked', () => {
      renderPage();

      fireEvent.change(screen.getByLabelText(/servidor/i), { target: { value: 'my-server' } });
      fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

      expect(toast.success).toHaveBeenCalledWith(
        'Configuración guardada',
        expect.objectContaining({ description: expect.any(String) })
      );
    });
  });
});
