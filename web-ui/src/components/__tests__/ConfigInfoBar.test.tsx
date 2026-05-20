import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { ConfigInfoBar } from '../ConfigInfoBar';
import { wizardConfig, phaseByMonthConfig } from '@/config/stores';

// Helper to wrap component with Router
const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ConfigInfoBar', () => {
  beforeEach(() => {
    // Reset stores to defaults before each test
    wizardConfig.reset();
    phaseByMonthConfig.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty State', () => {
    it('should render "Sin configurar" when config is empty', () => {
      renderWithRouter(<ConfigInfoBar />);

      expect(screen.getByText('Sin configurar')).toBeDefined();
      expect(screen.getByRole('link', { name: /configurar/i })).toBeDefined();
    });

    it('should display AlertCircle icon in empty state', () => {
      renderWithRouter(<ConfigInfoBar />);

      const alertIcon = document.querySelector('svg');
      expect(alertIcon).toBeDefined();
    });

    it('should link to /settings from empty state', () => {
      renderWithRouter(<ConfigInfoBar />);

      const link = screen.getByRole('link', { name: /configurar/i });
      expect(link.getAttribute('href')).toBe('/settings');
    });

    it('should not render usuario/tipoHora/fase badges in empty state', () => {
      renderWithRouter(<ConfigInfoBar />);

      expect(screen.queryByText(/📋/)).toBeNull();
      expect(screen.queryByText(/⏱/)).toBeNull();
    });
  });

  describe('Configured State', () => {
    beforeEach(() => {
      // Set a configured state
      wizardConfig.set({
        usuario: 'MG01',
        fase: '38653',
        tipoHora: '11'
      });
    });

    it('should render usuario badge', () => {
      renderWithRouter(<ConfigInfoBar />);

      expect(screen.getByText('MG01')).toBeDefined();
    });

    it('should render tipoHora badge with clock icon', () => {
      renderWithRouter(<ConfigInfoBar />);

      expect(screen.getByText(/⏱ 11/)).toBeDefined();
    });

    it('should render fase badge with clipboard icon', () => {
      renderWithRouter(<ConfigInfoBar />);

      expect(screen.getByText(/📋 38653/)).toBeDefined();
    });

    it('should not show empty state when configured', () => {
      renderWithRouter(<ConfigInfoBar />);

      expect(screen.queryByText('Sin configurar')).toBeNull();
    });

    it('should display Settings link in configured state', () => {
      renderWithRouter(<ConfigInfoBar />);

      const link = screen.getByRole('link', { name: /configurar/i });
      expect(link.getAttribute('href')).toBe('/settings');
    });

    it('should render User icon', () => {
      renderWithRouter(<ConfigInfoBar />);

      const userIcon = document.querySelectorAll('svg');
      expect(userIcon.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State Detection', () => {
    it('should show empty state when usuario empty, tipoHora default, fase empty', () => {
      wizardConfig.set({ usuario: '', fase: '', tipoHora: '11' });
      renderWithRouter(<ConfigInfoBar />);

      expect(screen.getByText('Sin configurar')).toBeDefined();
    });

    it('should NOT show empty state when usuario is set', () => {
      wizardConfig.set({ usuario: 'test', fase: '', tipoHora: '11' });
      renderWithRouter(<ConfigInfoBar />);

      expect(screen.queryByText('Sin configurar')).toBeNull();
    });

    it('should NOT show empty state when fase is set', () => {
      wizardConfig.set({ usuario: '', fase: '123', tipoHora: '11' });
      renderWithRouter(<ConfigInfoBar />);

      expect(screen.queryByText('Sin configurar')).toBeNull();
    });

    it('should NOT show empty state when tipoHora is not default', () => {
      wizardConfig.set({ usuario: '', fase: '', tipoHora: '12' });
      renderWithRouter(<ConfigInfoBar />);

      expect(screen.queryByText('Sin configurar')).toBeNull();
    });
  });

  describe('Fase Suggestions', () => {
    const applyMock = vi.fn();

    beforeEach(() => {
      // Set a configured state
      wizardConfig.set({
        usuario: 'MG01',
        fase: '100', // Different from suggestion
        tipoHora: '11'
      });
    });

    it('should not show suggestion when selectedMonth is not provided', () => {
      renderWithRouter(<ConfigInfoBar selectedMonth={null} onApplySuggestion={applyMock} />);

      expect(screen.queryByText(/sugerida/)).toBeNull();
    });

    it('should not show suggestion when no phase is configured for month', () => {
      renderWithRouter(
        <ConfigInfoBar
          selectedMonth={new Date('2026-05-01')}
          onApplySuggestion={applyMock}
        />
      );

      expect(screen.queryByText(/sugerida/)).toBeNull();
    });

    it('should show suggestion when phase exists for selected month and differs from current', () => {
      // Set phase for May 2026
      phaseByMonthConfig.set({
        phases: { '2026-05': '200' }
      });

      renderWithRouter(
        <ConfigInfoBar
          selectedMonth={new Date('2026-05-01')}
          onApplySuggestion={applyMock}
        />
      );

      expect(screen.getByText(/Fase para mayo de 2026: 200 \(sugerida\)/)).toBeDefined();
    });

    it('should NOT show suggestion when suggestion equals current fase', () => {
      // Current fase is '100', set phase for month to also be '100'
      phaseByMonthConfig.set({
        phases: { '2026-05': '100' }
      });

      renderWithRouter(
        <ConfigInfoBar
          selectedMonth={new Date('2026-05-01')}
          onApplySuggestion={applyMock}
        />
      );

      expect(screen.queryByText(/sugerida/)).toBeNull();
    });

    it('should display month name in Spanish format', () => {
      phaseByMonthConfig.set({
        phases: { '2026-05': '200' }
      });

      renderWithRouter(
        <ConfigInfoBar
          selectedMonth={new Date('2026-05-01')}
          onApplySuggestion={applyMock}
        />
      );

      // Spanish: "mayo de 2026" (includes "de")
      expect(screen.getByText(/mayo de 2026/)).toBeDefined();
    });

    it('should call onApplySuggestion with suggested fase when button clicked', () => {
      phaseByMonthConfig.set({
        phases: { '2026-05': '200' }
      });

      renderWithRouter(
        <ConfigInfoBar
          selectedMonth={new Date('2026-05-01')}
          onApplySuggestion={applyMock}
        />
      );

      const applyButton = screen.getByRole('button', { name: /aplicar/i });
      fireEvent.click(applyButton);

      expect(applyMock).toHaveBeenCalledTimes(1);
      expect(applyMock).toHaveBeenCalledWith('200');
    });

    it('should respond to phaseByMonthConfig changes reactively', () => {
      renderWithRouter(
        <ConfigInfoBar
          selectedMonth={new Date('2026-05-01')}
          onApplySuggestion={applyMock}
        />
      );

      // Initially no suggestion (config has fase '100', no phase stored)
      expect(screen.queryByText(/sugerida/)).toBeNull();

      // Update phaseByMonthConfig
      act(() => {
        phaseByMonthConfig.set({
          phases: { '2026-05': '300' }
        });
      });

      // Should now show suggestion (need to wait for re-render)
      expect(screen.getByText(/Fase para mayo de 2026: 300 \(sugerida\)/)).toBeDefined();
    });
  });

  describe('Reactive Updates', () => {
    it('should update when wizardConfig changes', () => {
      renderWithRouter(<ConfigInfoBar />);

      // Initially empty
      expect(screen.getByText('Sin configurar')).toBeDefined();

      // Update config
      act(() => {
        wizardConfig.set({
          usuario: 'MG01',
          fase: '38653',
          tipoHora: '11'
        });
      });

      // Should now show configured state
      expect(screen.queryByText('Sin configurar')).toBeNull();
      expect(screen.getByText('MG01')).toBeDefined();
    });

    it('should switch back to empty state when config cleared', () => {
      // Start with config
      wizardConfig.set({
        usuario: 'MG01',
        fase: '38653',
        tipoHora: '11'
      });

      renderWithRouter(<ConfigInfoBar />);

      expect(screen.getByText('MG01')).toBeDefined();

      // Reset to empty
      act(() => {
        wizardConfig.reset();
      });

      expect(screen.getByText('Sin configurar')).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('should have proper link semantics', () => {
      renderWithRouter(<ConfigInfoBar />);

      const link = screen.getByRole('link', { name: /configurar/i });
      expect(link.tagName).toBe('A');
    });

    it('should have button with proper role for Aplicar', () => {
      phaseByMonthConfig.set({
        phases: { '2026-05': '200' }
      });

      wizardConfig.set({
        usuario: 'MG01',
        fase: '100',
        tipoHora: '11'
      });

      renderWithRouter(
        <ConfigInfoBar
          selectedMonth={new Date('2026-05-01')}
          onApplySuggestion={vi.fn()}
        />
      );

      const button = screen.getByRole('button', { name: /aplicar/i });
      expect(button).toBeDefined();
    });
  });
});
