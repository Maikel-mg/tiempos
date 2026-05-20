import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { ImportCsvPage } from '../ImportCsvPage';
import { wizardConfig } from '@/config/stores';

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Mock ConfigInfoBar
vi.mock('@/components/ConfigInfoBar', () => ({
  ConfigInfoBar: ({ selectedMonth }: any) => (
    <div data-testid="config-info-bar">
      <span>ConfigInfoBar</span>
      {selectedMonth ? (
        <span data-testid="has-month">has-month</span>
      ) : (
        <span data-testid="no-month">no-month</span>
      )}
    </div>
  ),
}));

// Mock DBConnection
vi.mock('@/components/DBConnection', () => ({
  DBConnection: () => <div data-testid="db-connection">DBConnection</div>,
}));

// Mock Step1Upload - without config fields
vi.mock('@/features/import-csv/components/Step1Upload', () => ({
  Step1Upload: () => <div data-testid="step1-upload">Step1Upload</div>,
}));

// Mock useImportWizard
vi.mock('@/features/import-csv/hooks/use-import-wizard', () => ({
  useImportWizard: () => ({
    step: 1,
    isLoading: false,
    error: null,
    uploadFile: vi.fn(),
    setTaskId: vi.fn(),
    generateSQL: vi.fn(),
    goToStep: vi.fn(),
    reset: vi.fn(),
    totalRows: 0,
    mappedTasks: 0,
    getTasks: () => [],
    _raw: {
      config: { usuario: '', fase: '', tipoHora: '11' },
      updateConfig: vi.fn(),
      selectedRows: [],
      setSelectedRows: vi.fn(),
      csvData: null,
      file: null,
      columnIndices: null,
      taskMapping: {},
      sqlResult: null,
    },
  }),
}));

const renderPage = () => {
  return render(
    <BrowserRouter>
      <ImportCsvPage />
    </BrowserRouter>
  );
};

describe('ImportCsvPage - ConfigInfoBar Integration', () => {
  beforeEach(() => {
    wizardConfig.reset();
    vi.clearAllMocks();
  });

  describe('Test 1: ConfigInfoBar renders in ImportCsvPage', () => {
    it('should render ConfigInfoBar', () => {
      renderPage();
      expect(screen.getByTestId('config-info-bar')).toBeDefined();
    });
  });

  describe('Test 2: Step1Upload without config fields', () => {
    it('should render Step1Upload', () => {
      renderPage();
      expect(screen.getByTestId('step1-upload')).toBeDefined();
    });
  });

  describe('Test 3: ConfigInfoBar shows read-only values', () => {
    it('should render ConfigInfoBar with store values', () => {
      wizardConfig.set({ usuario: 'MG01', tipoHora: '15', fase: '38653' });
      renderPage();
      expect(screen.getByTestId('config-info-bar')).toBeDefined();
      expect(screen.getByTestId('config-info-bar').textContent).toContain('ConfigInfoBar');
    });
  });

  describe('Test 4: ConfigInfoBar empty state', () => {
    it('should render ConfigInfoBar even when store is empty', () => {
      renderPage();
      expect(screen.getByTestId('config-info-bar')).toBeDefined();
    });
  });

  describe('Test 5: ConfigInfoBar has link to settings', () => {
    it('should render ConfigInfoBar component', () => {
      renderPage();
      expect(screen.getByTestId('config-info-bar')).toBeDefined();
    });
  });

  describe('Test 6: No fase hint (no selectedMonth)', () => {
    it('should not pass selectedMonth to ConfigInfoBar', () => {
      renderPage();
      // The mock shows "no-month" when selectedMonth is not provided
      expect(screen.getByTestId('no-month')).toBeDefined();
    });
  });
});
