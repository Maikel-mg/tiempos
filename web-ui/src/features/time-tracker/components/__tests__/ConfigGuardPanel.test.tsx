import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ConfigGuardPanel } from '../ConfigGuardPanel';

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ConfigGuardPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders warning message about missing config', () => {
    render(
      <MemoryRouter>
        <ConfigGuardPanel />
      </MemoryRouter>
    );

    expect(screen.getByText(/configuración de base de datos/i)).toBeInTheDocument();
  });

  it('renders "Ir a Settings" button', () => {
    render(
      <MemoryRouter>
        <ConfigGuardPanel />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /ir a settings/i })).toBeInTheDocument();
  });

  it('navigates to /settings when CTA is clicked', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ConfigGuardPanel />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /ir a settings/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });
});
