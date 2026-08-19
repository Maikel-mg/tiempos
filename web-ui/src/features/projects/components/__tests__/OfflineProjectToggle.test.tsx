import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { OfflineProjectToggle } from '../OfflineProjectToggle';
import type { Project } from '../../types';
import type { OfflineProjectSelection } from '@/features/time-tracker/types';

const PROJECT: Project = {
  CodCli: '1',
  Cliente: 'Client 1',
  NomCliente: 'Client One',
  NomProy: 'Project One',
  Proyecto: 'P1',
  Abierto: true,
  IdDpto: 'D1',
  NomDpto: 'Department 1',
  IdAplicacion: 'App1',
  UsuredRespRev: 'user1',
};

const SELECTION_PENDIENTE: OfflineProjectSelection = {
  codCli: '1',
  proyecto: 'P1',
  nomProy: 'Project One',
  nomCliente: 'Client One',
  status: 'pendiente',
  markedAt: 1000,
};

describe('OfflineProjectToggle', () => {
  it('renders an unchecked switch when the project is not offline', () => {
    render(<OfflineProjectToggle project={PROJECT} onToggle={vi.fn()} />);

    const toggle = screen.getByRole('switch');
    expect(toggle).not.toBeChecked();
  });

  it('renders a checked switch with a "Sincronizado" badge for a synced selection', () => {
    render(
      <OfflineProjectToggle
        project={PROJECT}
        selection={{ ...SELECTION_PENDIENTE, status: 'sincronizado' }}
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByRole('switch')).toBeChecked();
    expect(screen.getByText('Sincronizado')).toBeInTheDocument();
  });

  it('renders a "Pendiente de sincronizar" badge for a pending selection', () => {
    render(
      <OfflineProjectToggle project={PROJECT} selection={SELECTION_PENDIENTE} onToggle={vi.fn()} />
    );

    expect(screen.getByRole('switch')).toBeChecked();
    expect(screen.getByText('Pendiente de sincronizar')).toBeInTheDocument();
  });

  it('shows a spinner instead of the switch while marking', () => {
    render(<OfflineProjectToggle project={PROJECT} marking onToggle={vi.fn()} />);

    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.getByLabelText('Marcando proyecto')).toBeInTheDocument();
  });

  it('calls onToggle(true) when the switch is checked and onToggle(false) when unchecked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    const { rerender } = render(<OfflineProjectToggle project={PROJECT} onToggle={onToggle} />);

    await user.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith(true);

    rerender(
      <OfflineProjectToggle project={PROJECT} selection={SELECTION_PENDIENTE} onToggle={onToggle} />
    );

    await user.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('renders the switch disabled with a tooltip when disabled (no usuario configured)', async () => {
    const user = userEvent.setup();
    render(<OfflineProjectToggle project={PROJECT} disabled onToggle={vi.fn()} />);

    expect(screen.getByRole('switch')).toBeDisabled();

    await user.hover(screen.getByRole('switch'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Configura un usuario en Ajustes');
  });

  it('stops click propagation so toggling does not navigate the row', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();

    render(
      <div onClick={onRowClick}>
        <OfflineProjectToggle project={PROJECT} onToggle={vi.fn()} />
      </div>
    );

    await user.click(screen.getByRole('switch'));
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
