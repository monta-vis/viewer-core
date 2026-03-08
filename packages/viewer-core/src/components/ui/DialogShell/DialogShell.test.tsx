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

  it('does not apply blur class when blur=false', () => {
    render(
      <DialogShell {...defaultProps} blur={false}>
        <p>No blur</p>
      </DialogShell>,
    );
    const backdrop = screen.getByTestId('dialog-shell-backdrop');
    expect(backdrop.className).not.toContain('backdrop-blur');
  });

  it('Escape stops propagation so parent listeners do not fire', async () => {
    const parentSpy = vi.fn();
    document.addEventListener('keydown', parentSpy);
    const user = userEvent.setup();
    render(
      <DialogShell {...defaultProps}>
        <p>Content</p>
      </DialogShell>,
    );
    await user.keyboard('{Escape}');
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    const escCalls = parentSpy.mock.calls.filter(
      ([e]: [KeyboardEvent]) => e.key === 'Escape',
    );
    expect(escCalls).toHaveLength(0);
    document.removeEventListener('keydown', parentSpy);
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

  describe('visual viewport (virtual keyboard)', () => {
    let originalVisualViewport: VisualViewport | null;

    beforeEach(() => {
      originalVisualViewport = window.visualViewport;
    });

    afterEach(() => {
      Object.defineProperty(window, 'visualViewport', {
        value: originalVisualViewport,
        writable: true,
        configurable: true,
      });
    });

    it('applies inline top/height from visualViewport when keyboard is open', () => {
      const listeners: Record<string, EventListener> = {};
      const fakeViewport = {
        height: 400,
        offsetTop: 0,
        width: 800,
        addEventListener: (type: string, fn: EventListener) => {
          listeners[type] = fn;
        },
        removeEventListener: vi.fn(),
      };
      Object.defineProperty(window, 'visualViewport', {
        value: fakeViewport,
        writable: true,
        configurable: true,
      });

      render(
        <DialogShell {...defaultProps}>
          <p>Content</p>
        </DialogShell>,
      );

      const backdrop = screen.getByTestId('dialog-shell-backdrop');
      expect(backdrop.style.height).toBe('400px');
      expect(backdrop.style.top).toBe('0px');
    });

    it('falls back to innerHeight when visualViewport is unavailable', () => {
      Object.defineProperty(window, 'visualViewport', {
        value: null,
        writable: true,
        configurable: true,
      });

      render(
        <DialogShell {...defaultProps}>
          <p>Content</p>
        </DialogShell>,
      );

      const backdrop = screen.getByTestId('dialog-shell-backdrop');
      expect(backdrop.style.height).toBe(`${window.innerHeight}px`);
      expect(backdrop.style.top).toBe('0px');
    });
  });
});
