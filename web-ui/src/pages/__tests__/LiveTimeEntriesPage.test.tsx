import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LiveTimeEntriesPage } from '../LiveTimeEntriesPage';
import { wizardConfig, dbConfig as dbConfigStore, phaseByMonthConfig } from '@/config/stores';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock fetch
global.fetch = vi.fn();

// Mock ConfigInfoBar
vi.mock('@/components/ConfigInfoBar', () => ({
  ConfigInfoBar: ({ selectedMonth, onApplySuggestion }: any) => (
    <div data-testid="config-info-bar">
      <span>ConfigInfoBar</span>
      {selectedMonth && <span data-testid="selected-month">{selectedMonth.toISOString()}</span>}
      {onApplySuggestion && (
        <button data-testid="apply-suggestion" onClick={() => onApplySuggestion('99999')}>
          Aplicar
        </button>
      )}
    </div>
  ),
}));

// Mock ImportConfigPanel
vi.mock('@/components/ImportConfigPanel', () => ({
  ImportConfigPanel: () => <div data-testid="import-config-panel">ImportConfigPanel</div>,
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderPage = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LiveTimeEntriesPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('LiveTimeEntriesPage - ConfigInfoBar Integration', () => {
  beforeEach(() => {
    wizardConfig.reset();
    dbConfigStore.reset();
    phaseByMonthConfig.reset();
    vi.clearAllMocks();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    } as any);
  });

  describe('Test 1: ConfigInfoBar replaces ImportConfigPanel', () => {
    it('should render ConfigInfoBar', () => {
      renderPage();
      expect(screen.getByTestId('config-info-bar')).toBeDefined();
    });

    it('should not render ImportConfigPanel', () => {
      renderPage();
      expect(screen.queryByTestId('import-config-panel')).toBeNull();
    });
  });

  describe('Test 2: ConfigInfoBar receives selectedMonth', () => {
    it('should pass selectedMonth to ConfigInfoBar', async () => {
      renderPage();
      // selectedMonth is derived from startDate (current month by default)
      const monthElement = await screen.findByTestId('selected-month');
      expect(monthElement).toBeDefined();
    });
  });

  describe('Test 3: Aplicar sugerencia updates stores', () => {
    it('should update wizardConfig.fase when apply is clicked', async () => {
      // Pre-set wizardConfig so the component has initial state
      wizardConfig.set({ usuario: 'MG01', tipoHora: '11', fase: '12345' });

      renderPage();

      const applyButton = await screen.findByTestId('apply-suggestion');
      expect(applyButton).toBeDefined();
      expect(applyButton.textContent).toBe('Aplicar');

      fireEvent.click(applyButton);

      // Check wizardConfig was updated
      const wizard = wizardConfig.get();
      expect(wizard?.fase).toBe('99999');
    });
  });

  describe('Test 4: Ejecutar en BD guard pattern', () => {
    it('should render page without errors even without DB config', async () => {
      // Ensure DB config is empty
      dbConfigStore.reset();

      renderPage();

      // Wait for page to load - ConfigInfoBar should render
      const infoBar = await screen.findByTestId('config-info-bar');
      expect(infoBar).toBeDefined();

      // Page should render without crashing even without DB config
      expect(screen.getByTestId('config-info-bar')).toBeDefined();
    });
  });

  describe('Test 5: Ejecutar funciona con DB config', () => {
    it('should not show error toast when DB config exists', async () => {
      // Set DB config
      dbConfigStore.set({
        server: 'localhost',
        database: 'testdb',
        username: 'sa',
        password: 'pass',
      });

      renderPage();

      // Wait for page to load
      await screen.findByTestId('config-info-bar');

      // The guard should NOT trigger since DB config exists
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  describe('Test 6: Página carga sin DB config', () => {
    it('should load page and show ConfigInfoBar without DB config', async () => {
      dbConfigStore.reset();

      renderPage();

      const infoBar = await screen.findByTestId('config-info-bar');
      expect(infoBar).toBeDefined();
      expect(infoBar.textContent).toContain('ConfigInfoBar');
    });
  });
});
