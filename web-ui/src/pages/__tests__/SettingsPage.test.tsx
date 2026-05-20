import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsPage } from '../SettingsPage';
import { dbConfig, wizardConfig } from '@/config/stores';

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

// Helpers to get specific inputs by id
const getServerInput = () => document.getElementById('server') as HTMLInputElement;
const getDatabaseInput = () => document.getElementById('database') as HTMLInputElement;
const getUsernameInput = () => document.getElementById('username') as HTMLInputElement;
const getPasswordInput = () => document.getElementById('password') as HTMLInputElement;
const getWizardUsuarioInput = () => document.getElementById('wizard-usuario') as HTMLInputElement;
const getWizardTipoHoraInput = () => document.getElementById('wizard-tipoHora') as HTMLInputElement;
const getWizardFaseInput = () => document.getElementById('wizard-fase') as HTMLInputElement;

describe('SettingsPage - DB Connection Section', () => {
  beforeEach(() => {
    dbConfig.reset();
    wizardConfig.reset();
    vi.clearAllMocks();
  });

  describe('Test 1: Renders 4 form fields', () => {
    it('should render server input', () => {
      renderPage();
      expect(getServerInput()).toBeDefined();
    });

    it('should render database input', () => {
      renderPage();
      expect(getDatabaseInput()).toBeDefined();
    });

    it('should render username input', () => {
      renderPage();
      expect(getUsernameInput()).toBeDefined();
    });

    it('should render password input', () => {
      renderPage();
      expect(getPasswordInput()).toBeDefined();
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

      expect(getServerInput().value).toBe('localhost\\SQLEXPRESS');
      expect(getDatabaseInput().value).toBe('TiemposDB');
      expect(getUsernameInput().value).toBe('sa');
      expect(getPasswordInput().value).toBe('secret123');
    });

    it('should show empty fields when store is empty', () => {
      renderPage();

      expect(getServerInput().value).toBe('');
      expect(getDatabaseInput().value).toBe('');
      expect(getUsernameInput().value).toBe('');
      expect(getPasswordInput().value).toBe('');
    });
  });

  describe('Test 3: Guardar persists to store', () => {
    it('should persist form values to dbConfig store when Guardar is clicked', () => {
      renderPage();

      fireEvent.change(getServerInput(), { target: { value: 'my-server' } });
      fireEvent.change(getDatabaseInput(), { target: { value: 'my-db' } });
      fireEvent.change(getUsernameInput(), { target: { value: 'admin' } });
      fireEvent.change(getPasswordInput(), { target: { value: 'pass123' } });

      // Click first Guardar button (DB section)
      const saveButtons = screen.getAllByRole('button', { name: /guardar/i });
      fireEvent.click(saveButtons[0]);

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

      fireEvent.change(getServerInput(), { target: { value: 'changed-server' } });
      fireEvent.change(getDatabaseInput(), { target: { value: 'changed-db' } });

      // Click first Restablecer button (DB section)
      const resetButtons = screen.getAllByRole('button', { name: /restablecer/i });
      fireEvent.click(resetButtons[0]);

      expect(getServerInput().value).toBe('saved-server');
      expect(getDatabaseInput().value).toBe('saved-db');
      expect(getUsernameInput().value).toBe('saved-user');
      expect(getPasswordInput().value).toBe('saved-pass');
    });
  });

  describe('Test 5: Password show/hide toggle', () => {
    it('should have password type by default', () => {
      renderPage();
      expect(getPasswordInput().type).toBe('password');
    });

    it('should toggle to text type when eye button is clicked', () => {
      renderPage();

      const toggleButton = screen.getByRole('button', { name: '' }); // eye icon button
      fireEvent.click(toggleButton);

      expect(getPasswordInput().type).toBe('text');
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

      fireEvent.change(getServerInput(), { target: { value: 'my-server' } });
      fireEvent.change(getDatabaseInput(), { target: { value: 'my-db' } });
      fireEvent.change(getUsernameInput(), { target: { value: 'admin' } });
      fireEvent.change(getPasswordInput(), { target: { value: 'pass123' } });

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

      fireEvent.change(getServerInput(), { target: { value: 'my-server' } });

      const saveButtons = screen.getAllByRole('button', { name: /guardar/i });
      fireEvent.click(saveButtons[0]);

      expect(toast.success).toHaveBeenCalledWith(
        'Configuración guardada',
        expect.objectContaining({ description: expect.any(String) })
      );
    });
  });
});

describe('SettingsPage - Wizard Config Section', () => {
  beforeEach(() => {
    dbConfig.reset();
    wizardConfig.reset();
    vi.clearAllMocks();
  });

  describe('Test 1: Renders wizard section with fields', () => {
    it('should render section heading "Preferencias de Importación"', () => {
      renderPage();
      expect(screen.getByText(/preferencias de importación/i)).toBeDefined();
    });

    it('should render wizard usuario input', () => {
      renderPage();
      expect(getWizardUsuarioInput()).toBeDefined();
    });

    it('should render tipoHora input', () => {
      renderPage();
      expect(getWizardTipoHoraInput()).toBeDefined();
    });

    it('should render fase as read-only input', () => {
      renderPage();
      expect(getWizardFaseInput()).toBeDefined();
      expect(getWizardFaseInput().readOnly).toBe(true);
    });
  });

  describe('Test 2: Fase is read-only', () => {
    it('should have readonly attribute on fase input', () => {
      renderPage();
      expect(getWizardFaseInput().readOnly).toBe(true);
      expect(getWizardFaseInput().disabled).toBe(true);
    });
  });

  describe('Test 3: Fields pre-populated from wizardConfig store', () => {
    it('should populate usuario and tipoHora when store has values', () => {
      wizardConfig.set({
        usuario: 'MG01',
        tipoHora: '15',
        fase: '38653',
      });

      renderPage();

      expect(getWizardUsuarioInput().value).toBe('MG01');
      expect(getWizardTipoHoraInput().value).toBe('15');
    });
  });

  describe('Test 4: Guardar persists wizard config', () => {
    it('should persist usuario and tipoHora to wizardConfig store', () => {
      renderPage();

      fireEvent.change(getWizardUsuarioInput(), { target: { value: 'MG02' } });
      fireEvent.change(getWizardTipoHoraInput(), { target: { value: '20' } });

      // Click second Guardar button (wizard section)
      const saveButtons = screen.getAllByRole('button', { name: /guardar/i });
      fireEvent.click(saveButtons[saveButtons.length - 1]);

      const saved = wizardConfig.get();
      expect(saved?.usuario).toBe('MG02');
      expect(saved?.tipoHora).toBe('20');
    });
  });

  describe('Test 5: Restablecer reverts wizard config', () => {
    it('should revert wizard fields to last saved values', () => {
      wizardConfig.set({
        usuario: 'SAVED',
        tipoHora: '11',
        fase: '99999',
      });

      renderPage();

      fireEvent.change(getWizardUsuarioInput(), { target: { value: 'CHANGED' } });

      // Click second Restablecer button (wizard section)
      const resetButtons = screen.getAllByRole('button', { name: /restablecer/i });
      fireEvent.click(resetButtons[resetButtons.length - 1]);

      expect(getWizardUsuarioInput().value).toBe('SAVED');
    });
  });

  describe('Test 6: Toast on wizard save', () => {
    it('should show success toast when wizard Guardar is clicked', () => {
      renderPage();

      const saveButtons = screen.getAllByRole('button', { name: /guardar/i });
      fireEvent.click(saveButtons[saveButtons.length - 1]);

      expect(toast.success).toHaveBeenCalled();
    });
  });
});
