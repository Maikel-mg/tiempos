import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TaskProposalCard } from '../components/TaskProposalCard';
import type { TaskProposal } from '@/domain/proposals/extract-proposals';

const mockProposals: TaskProposal[] = [
  {
    description: 'Reunión de seguimiento',
    genericTask: 'Meetings',
    totalHours: 2.5,
    proposedName: 'Reunión seguimiento proyecto',
    projectCode: 'PRJ1',
    period: '2024-01',
    fechaInicio: '2024-01-01',
    fechaFin: '2024-01-31',
    entryCount: 3,
    entryIds: ['1', '2', '3'],
    clockifyProjectId: 'cp1',
  },
  {
    description: 'Code review',
    genericTask: 'Development',
    totalHours: 1.5,
    proposedName: 'Code review sprint',
    projectCode: 'PRJ2',
    period: '2024-01',
    fechaInicio: '2024-01-01',
    fechaFin: '2024-01-31',
    entryCount: 2,
    entryIds: ['4', '5'],
    clockifyProjectId: 'cp2',
  },
];

describe('TaskProposalCard', () => {
  it('renders title and badge with proposal count', () => {
    render(
      <TaskProposalCard
        proposals={mockProposals}
        onOpenModal={vi.fn()}
      />
    );

    expect(screen.getByText('Propuestas de Tareas')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
  });

  it('shows green badge when no proposals', () => {
    render(
      <TaskProposalCard
        proposals={[]}
        onOpenModal={vi.fn()}
      />
    );

    const badge = screen.getByText('0');
    expect(badge.className).toContain('bg-green-100');
  });

  it('shows amber badge when proposals exist', () => {
    render(
      <TaskProposalCard
        proposals={mockProposals}
        onOpenModal={vi.fn()}
      />
    );

    const badge = screen.getByText('2');
    expect(badge.className).toContain('bg-yellow-100');
  });

  it('shows description with total hours when proposals exist', () => {
    render(
      <TaskProposalCard
        proposals={mockProposals}
        onOpenModal={vi.fn()}
      />
    );

    // 2.5 + 1.5 = 4h
    expect(screen.getByText(/2 descripción\(es\) con 4h acumuladas/)).toBeDefined();
  });

  it('shows empty state when no proposals', () => {
    render(
      <TaskProposalCard
        proposals={[]}
        onOpenModal={vi.fn()}
      />
    );

    expect(screen.getByText('No hay propuestas pendientes')).toBeDefined();
  });

  it('starts expanded when proposals exist', () => {
    render(
      <TaskProposalCard
        proposals={mockProposals}
        onOpenModal={vi.fn()}
      />
    );

    // Description should be visible (expanded state)
    expect(screen.getByText(/2 descripción\(es\) con 4h acumuladas/)).toBeDefined();
  });

  it('starts collapsed when no proposals', () => {
    render(
      <TaskProposalCard
        proposals={[]}
        onOpenModal={vi.fn()}
      />
    );

    // Description is always in the header (like ProcessMappingTable)
    expect(screen.getByText('No hay propuestas pendientes')).toBeDefined();
    // ChevronDown indicates collapsed state
    const chevronDown = document.querySelector('.lucide-chevron-down');
    expect(chevronDown).not.toBeNull();
    // ChevronUp should NOT be present (not expanded)
    const chevronUp = document.querySelector('.lucide-chevron-up');
    expect(chevronUp).toBeNull();
  });

  it('calls onOpenModal when header is clicked', () => {
    const onOpenModal = vi.fn();
    render(
      <TaskProposalCard
        proposals={mockProposals}
        onOpenModal={onOpenModal}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(onOpenModal).toHaveBeenCalledTimes(1);
  });
});
