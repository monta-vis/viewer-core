import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MediaEditDialog } from './MediaEditDialog';

afterEach(cleanup);

describe('MediaEditDialog', () => {
  it('does not render when open is false', () => {
    render(
      <MediaEditDialog open={false} onClose={vi.fn()} sidebar={<div>sidebar</div>}>
        <div>content</div>
      </MediaEditDialog>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders portal to document.body when open', () => {
    render(
      <MediaEditDialog open={true} onClose={vi.fn()} sidebar={<div>sidebar</div>}>
        <div>content</div>
      </MediaEditDialog>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders backdrop with blur', () => {
    render(
      <MediaEditDialog open={true} onClose={vi.fn()} sidebar={<div>sidebar</div>}>
        <div>content</div>
      </MediaEditDialog>,
    );
    const backdrop = document.querySelector('.backdrop-blur-sm');
    expect(backdrop).toBeInTheDocument();
  });

  it('renders children in the left panel', () => {
    render(
      <MediaEditDialog open={true} onClose={vi.fn()} sidebar={<div>sidebar</div>}>
        <div>left content</div>
      </MediaEditDialog>,
    );
    expect(screen.getByText('left content')).toBeInTheDocument();
  });

  it('renders sidebar in the right panel', () => {
    render(
      <MediaEditDialog open={true} onClose={vi.fn()} sidebar={<div>right sidebar</div>}>
        <div>content</div>
      </MediaEditDialog>,
    );
    expect(screen.getByText('right sidebar')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <MediaEditDialog open={true} onClose={onClose} sidebar={<div>sidebar</div>}>
        <div>content</div>
      </MediaEditDialog>,
    );
    const backdrop = screen.getByTestId('media-edit-backdrop');
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('disableBackdropClick', () => {
    it('does not call onClose on backdrop click when disableBackdropClick is true', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <MediaEditDialog open={true} onClose={onClose} sidebar={<div>sidebar</div>} disableBackdropClick>
          <div>content</div>
        </MediaEditDialog>,
      );
      const backdrop = screen.getByTestId('media-edit-backdrop');
      await user.click(backdrop);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('calls onClose on backdrop click when disableBackdropClick is false', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <MediaEditDialog open={true} onClose={onClose} sidebar={<div>sidebar</div>} disableBackdropClick={false}>
          <div>content</div>
        </MediaEditDialog>,
      );
      const backdrop = screen.getByTestId('media-edit-backdrop');
      await user.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
