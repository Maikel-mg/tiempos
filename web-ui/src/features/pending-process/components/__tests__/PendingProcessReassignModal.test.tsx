import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { PendingProcessReassignModal, type Reassignment } from '../PendingProcessReassignModal';
import type { Proceso, TimeEntry } from '@/features/time-tracker/types';

Element.prototype.hasPointerCapture = vi.fn(() => false);
Element.prototype.scrollIntoView = vi.fn();
HTMLElement.prototype.focus = vi.fn();

const PROCESSES: Proceso[] = [
  { proceso: 101, nombre: 'Proceso Alpha', departamentoId: 5 },
  { proceso: 102, nombre: 'Proceso Beta', departamentoId: 5 },
];

function makeEntry(id: string, date = '2026-06-01'): TimeEntry {
  return {
    id,
    taskId: -1,
    taskName: 'Pendiente a eliminar',
    proceso: { proceso: -1, nombre: 'Pendiente a eliminar', esPendiente: true },
    date,
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    description: `desc ${id}`,
    createdAt: `${date}T09:00:00Z`,
    updatedAt: `${date}T09:00:00Z`,
    synced: false,
  };
}

const ENTRIES = [makeEntry('e1'), makeEntry('e2')];

describe('PendingProcessReassignModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    render(
      <PendingProcessReassignModal
        open={false}
        onOpenChange={vi.fn()}
        entries={ENTRIES}
        processes={PROCESSES}
        pendingNombre="Pendiente a eliminar"
        pendingId={-1}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.queryByRole('heading', { name: /reasignar antes de eliminar/i })).not.toBeInTheDocument();
  });

  it('shows the affected entries and the pending process name', () => {
    render(
      <PendingProcessReassignModal
        open={true}
        onOpenChange={vi.fn()}
        entries={ENTRIES}
        processes={PROCESSES}
        pendingNombre="Pendiente a eliminar"
        pendingId={-1}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /reasignar antes de eliminar/i })).toBeInTheDocument();
    expect(screen.getByText(/tiene 2 entrada\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText(/desc e1/)).toBeInTheDocument();
    expect(screen.getByText(/desc e2/)).toBeInTheDocument();
  });

  it('keeps the delete button disabled until every entry has a target', () => {
    render(
      <PendingProcessReassignModal
        open={true}
        onOpenChange={vi.fn()}
        entries={ENTRIES}
        processes={PROCESSES}
        pendingNombre="Pendiente a eliminar"
        pendingId={-1}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /confirmar eliminación/i })).toBeDisabled();
  });

  it('enables delete and reports assignments when every entry is reassigned', async () => {
    const onConfirm = vi.fn();

    render(
      <PendingProcessReassignModal
        open={true}
        onOpenChange={vi.fn()}
        entries={ENTRIES}
        processes={PROCESSES}
        pendingNombre="Pendiente a eliminar"
        pendingId={-1}
        onConfirm={onConfirm}
      />
    );

    const comboboxes = screen.getAllByRole('combobox', { name: /reasignar entrada/i });
    expect(comboboxes).toHaveLength(2);

    // Assign e1 → Proceso Alpha, e2 → Proceso Beta
    fireEvent.click(comboboxes[0]);
    fireEvent.click(await screen.findByText(/Proceso Alpha — ID 101/));
    fireEvent.click(comboboxes[1]);
    fireEvent.click(await screen.findByText(/Proceso Beta — ID 102/));

    const confirmBtn = screen.getByRole('button', { name: /confirmar eliminación/i });
    await waitFor(() => {
      expect(confirmBtn).toBeEnabled();
    });

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    const assignments: Reassignment[] = onConfirm.mock.calls[0][0];
    expect(assignments).toHaveLength(2);
    expect(assignments[0]).toEqual({ entryId: 'e1', proceso: PROCESSES[0] });
    expect(assignments[1]).toEqual({ entryId: 'e2', proceso: PROCESSES[1] });
  });

  it('reassigns all entries to the bulk selected process with one click', async () => {
    const onConfirm = vi.fn();

    render(
      <PendingProcessReassignModal
        open={true}
        onOpenChange={vi.fn()}
        entries={ENTRIES}
        processes={PROCESSES}
        pendingNombre="Pendiente a eliminar"
        pendingId={-1}
        onConfirm={onConfirm}
      />
    );

    // Bulk select: use the dedicated bulk combobox
    const bulkSelect = screen.getByRole('combobox', { name: /reasignar todas/i });
    fireEvent.click(bulkSelect);
    fireEvent.click(await screen.findByText(/Proceso Alpha — ID 101/));
    fireEvent.click(screen.getByRole('button', { name: /reasignar todas/i }));

    const confirmBtn = screen.getByRole('button', { name: /confirmar eliminación/i });
    await waitFor(() => {
      expect(confirmBtn).toBeEnabled();
    });

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    const assignments: Reassignment[] = onConfirm.mock.calls[0][0];
    expect(assignments).toHaveLength(2);
    expect(assignments.every((a) => a.proceso.proceso === 101)).toBe(true);
  });
});
