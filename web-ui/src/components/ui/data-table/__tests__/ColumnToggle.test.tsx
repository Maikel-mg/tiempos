import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ColumnToggle } from '../ColumnToggle';

describe('ColumnToggle', () => {
  const columns = [
    { id: 'nombre', label: 'Nombre', visible: true },
    { id: 'fase', label: 'Fase', visible: true },
    { id: 'proyecto', label: 'Proyecto', visible: false },
  ];

  it('renders a button that opens a dropdown', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(<ColumnToggle columns={columns} onToggle={onToggle} />);

    const button = screen.getByRole('button', { name: /columnas/i });
    expect(button).toBeDefined();

    await user.click(button);
    expect(screen.getByText('Nombre')).toBeDefined();
    expect(screen.getByText('Fase')).toBeDefined();
    expect(screen.getByText('Proyecto')).toBeDefined();
  });

  it('shows checkboxes with correct checked state', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(<ColumnToggle columns={columns} onToggle={onToggle} />);

    await user.click(screen.getByRole('button', { name: /columnas/i }));

    const nombreCheckbox = screen.getByRole('menuitemcheckbox', { name: /nombre/i });
    const faseCheckbox = screen.getByRole('menuitemcheckbox', { name: /fase/i });
    const proyectoCheckbox = screen.getByRole('menuitemcheckbox', { name: /proyecto/i });

    expect(nombreCheckbox).toHaveAttribute('aria-checked', 'true');
    expect(faseCheckbox).toHaveAttribute('aria-checked', 'true');
    expect(proyectoCheckbox).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onToggle when a checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(<ColumnToggle columns={columns} onToggle={onToggle} />);

    await user.click(screen.getByRole('button', { name: /columnas/i }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: /proyecto/i }));

    expect(onToggle).toHaveBeenCalledWith('proyecto', true);
  });

  it('calls onToggle with false when unchecking a visible column', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(<ColumnToggle columns={columns} onToggle={onToggle} />);

    await user.click(screen.getByRole('button', { name: /columnas/i }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: /nombre/i }));

    expect(onToggle).toHaveBeenCalledWith('nombre', false);
  });
});
