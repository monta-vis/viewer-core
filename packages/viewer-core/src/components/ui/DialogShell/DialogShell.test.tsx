import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DialogShell } from './DialogShell';

afterEach(cleanup);

const defaultProps = {
  open: true,
  onClose: vi.fn(),
};

beforeEach(() => {
  defaultProps.onClose.mockClear();
});

describe('DialogShell', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <DialogShell {...defaultProps} open={false}>
        <p>Content</p>
      </DialogShell>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders children when open=true', () => {
    render(
      <DialogShell {...defaultProps}>
        <p>Hello Dialog</p>
      </DialogShell>,
    );
    expect(screen.getByText('Hello Dialog')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    render(
      <DialogShell {...defaultProps}>
        <p>Content</p>
      </DialogShell>,
    );
    const backdrop = screen.getByTestId('dialog-shell-backdrop');
    await user.click(backdrop);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key', async () => {
    const user = userEvent.setup();
    render(
      <DialogShell {...defaultProps}>
        <p>Content</p>
      </DialogShell>,
    );
    await user.keyboard('{Escape}');
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when panel content is clicked', async () => {
    const user = userEvent.setup();
    render(
      <DialogShell {...defaultProps}>
        <p>Click Me</p>
      </DialogShell>,
    );
    await user.click(screen.getByText('Click Me'));
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('applies custom maxWidth class', () => {
    render(
      <DialogShell {...defaultProps} maxWidth="max-w-4xl">
        <p>Wide</p>
      </DialogShell>,
    );
    const panel = screen.getByTestId('dialog-shell-panel');
    expect(panel.className).toContain('max-w-4xl');
    expect(panel.className).not.toContain('max-w-lg');
  });

  it('defaults to max-w-lg when no maxWidth provided', () => {
    render(
      <DialogShell {...defaultProps}>
        <p>Default</p>
      </DialogShell>,
    );
    const panel = screen.getByTestId('dialog-shell-panel');
    expect(panel.className).toContain('max-w-lg');
  });

  it('applies blur class when blur=true', () => {
    render(
      <DialogShell {...defaultProps} blur>
        <p>Blurred</p>
      </DialogShell>,
    );
    const backdrop = screen.getByTestId('dialog-shell-backdrop');
    expect(backdrop.className).toContain('backdrop-blur-sm');
  });

  it('does not apply blur class by default', () => {
    render(
      <DialogShell {...defaultProps}>
        <p>No blur</p>
      </DialogShell>,
    );
    const backdrop = screen.getByTestId('dialog-shell-backdrop');
    expect(backdrop.className).not.toContain('backdrop-blur');
  });

  it('applies custom className to the panel', () => {
    render(
      <DialogShell {...defaultProps} className="custom-class">
        <p>Custom</p>
      </DialogShell>,
    );
    const panel = screen.getByTestId('dialog-shell-panel');
    expect(panel.className).toContain('custom-class');
  });
});
