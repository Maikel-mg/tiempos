import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MidnightSplitModal } from '../MidnightSplitModal';
import type { SplitProposal } from '../../lib/timerCrossingDetector';

const PROPOSAL: SplitProposal[] = [
  { date: '2026-06-01', startTime: '23:30', endTime: '23:59', minutes: 29 },
  { date: '2026-06-02', startTime: '00:00', endTime: '00:15', minutes: 16 },
];

describe('MidnightSplitModal', () => {
  it('renders proposal data with split and keep-single buttons', () => {
    render(
      <MidnightSplitModal
        open={true}
        onOpenChange={vi.fn()}
        proposal={PROPOSAL}
        onSplit={vi.fn()}
        onKeepSingle={vi.fn()}
      />
    );

    expect(screen.getByText(/2026-06-01/)).toBeInTheDocument();
    expect(screen.getByText(/2026-06-02/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dividir/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dejar como uno/i })).toBeInTheDocument();
  });

  it('calls onSplit when split button is clicked', async () => {
    const user = userEvent.setup();
    const onSplit = vi.fn();
    const onKeepSingle = vi.fn();

    render(
      <MidnightSplitModal
        open={true}
        onOpenChange={vi.fn()}
        proposal={PROPOSAL}
        onSplit={onSplit}
        onKeepSingle={onKeepSingle}
      />
    );

    await user.click(screen.getByRole('button', { name: /dividir/i }));

    expect(onSplit).toHaveBeenCalledTimes(1);
    expect(onKeepSingle).not.toHaveBeenCalled();
  });

  it('calls onKeepSingle when keep-single button is clicked', async () => {
    const user = userEvent.setup();
    const onSplit = vi.fn();
    const onKeepSingle = vi.fn();

    render(
      <MidnightSplitModal
        open={true}
        onOpenChange={vi.fn()}
        proposal={PROPOSAL}
        onSplit={onSplit}
        onKeepSingle={onKeepSingle}
      />
    );

    await user.click(screen.getByRole('button', { name: /dejar como uno/i }));

    expect(onKeepSingle).toHaveBeenCalledTimes(1);
    expect(onSplit).not.toHaveBeenCalled();
  });

  it('calls onKeepSingle when X close button is clicked', async () => {
    const user = userEvent.setup();
    const onSplit = vi.fn();
    const onKeepSingle = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <MidnightSplitModal
        open={true}
        onOpenChange={onOpenChange}
        proposal={PROPOSAL}
        onSplit={onSplit}
        onKeepSingle={onKeepSingle}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(onKeepSingle).toHaveBeenCalledTimes(1);
    expect(onSplit).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not render when open is false', () => {
    render(
      <MidnightSplitModal
        open={false}
        onOpenChange={vi.fn()}
        proposal={PROPOSAL}
        onSplit={vi.fn()}
        onKeepSingle={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /dividir/i })).not.toBeInTheDocument();
  });
});
