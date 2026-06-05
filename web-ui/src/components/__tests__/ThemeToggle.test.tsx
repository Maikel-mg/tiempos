import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThemeToggle } from '../ThemeToggle';
import { TooltipProvider } from '@/components/ui/tooltip';

const renderWithTooltip = (component: React.ReactNode) => {
  return render(<TooltipProvider>{component}</TooltipProvider>);
};

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  describe('rendering', () => {
    it('renders a button with accessible label', () => {
      renderWithTooltip(<ThemeToggle />);

      const button = screen.getByRole('button', { name: /cambiar tema/i });
      expect(button).toBeDefined();
    });

    it('shows moon icon when in light mode (click to switch to dark)', () => {
      renderWithTooltip(<ThemeToggle />);

      const button = screen.getByRole('button', { name: /cambiar tema/i });
      const svg = button.querySelector('svg');
      expect(svg).toBeDefined();
    });

    it('shows sun icon when in dark mode', () => {
      localStorage.setItem('theme', 'dark');

      renderWithTooltip(<ThemeToggle />);

      const button = screen.getByRole('button', { name: /cambiar tema/i });
      const svg = button.querySelector('svg');
      expect(svg).toBeDefined();
    });
  });

  describe('interaction', () => {
    it('toggles to dark mode when clicked', () => {
      renderWithTooltip(<ThemeToggle />);

      const button = screen.getByRole('button', { name: /cambiar tema/i });
      fireEvent.click(button);

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('toggles to light mode when clicked in dark mode', () => {
      localStorage.setItem('theme', 'dark');
      renderWithTooltip(<ThemeToggle />);

      const button = screen.getByRole('button', { name: /cambiar tema/i });
      fireEvent.click(button);

      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(localStorage.getItem('theme')).toBe('light');
    });

    it('cycles through dark and light on multiple clicks', () => {
      renderWithTooltip(<ThemeToggle />);
      const button = screen.getByRole('button', { name: /cambiar tema/i });

      fireEvent.click(button);
      expect(localStorage.getItem('theme')).toBe('dark');

      fireEvent.click(button);
      expect(localStorage.getItem('theme')).toBe('light');

      fireEvent.click(button);
      expect(localStorage.getItem('theme')).toBe('dark');
    });
  });

  describe('persistence', () => {
    it('reflects stored dark preference on render', () => {
      localStorage.setItem('theme', 'dark');

      renderWithTooltip(<ThemeToggle />);

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('reflects stored light preference on render', () => {
      localStorage.setItem('theme', 'light');

      renderWithTooltip(<ThemeToggle />);

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});
