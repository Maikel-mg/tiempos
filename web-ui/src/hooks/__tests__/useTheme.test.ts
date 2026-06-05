import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTheme } from '../useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  describe('initial state', () => {
    it('returns light theme when no stored preference exists', () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('light');
    });

    it('returns dark theme when localStorage has dark preference', () => {
      localStorage.setItem('theme', 'dark');

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('dark');
    });

    it('applies dark class to document when initial theme is dark', () => {
      localStorage.setItem('theme', 'dark');

      renderHook(() => useTheme());

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('toggle', () => {
    it('switches from light to dark', () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('light');

      act(() => {
        result.current.toggle();
      });

      expect(result.current.theme).toBe('dark');
    });

    it('switches from dark to light', () => {
      localStorage.setItem('theme', 'dark');
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe('dark');

      act(() => {
        result.current.toggle();
      });

      expect(result.current.theme).toBe('light');
    });

    it('persists theme to localStorage after toggle', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggle();
      });

      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('adds dark class to document after toggling to dark', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggle();
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('removes dark class from document after toggling to light', () => {
      localStorage.setItem('theme', 'dark');
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggle();
      });

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('localStorage graceful degradation', () => {
    it('does not throw when localStorage is unavailable', () => {
      const originalGetItem = Storage.prototype.getItem;
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error('localStorage unavailable');
      });
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('localStorage unavailable');
      });

      const { result } = renderHook(() => useTheme());

      expect(() => {
        act(() => {
          result.current.toggle();
        });
      }).not.toThrow();

      // Theme still changes visually even if persistence fails
      expect(result.current.theme).toBe('dark');

      Storage.prototype.getItem = originalGetItem;
      Storage.prototype.setItem = originalSetItem;
    });
  });
});
