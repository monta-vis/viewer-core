import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

import { ViewportBox } from './ViewportBox';

afterEach(cleanup);

describe('ViewportBox', () => {
  const baseProps = {
    x: 0.1,
    y: 0.2,
    width: 0.5,
    height: 0.4,
    containerWidth: 800,
    containerHeight: 600,
    onChange: vi.fn(),
  };

  it('renders with correct position and size styles', () => {
    const { container } = render(<ViewportBox {...baseProps} />);
    const box = container.querySelector(
      '[data-testid="viewport-box"]',
    ) as HTMLElement;
    expect(box).toBeInTheDocument();
    // x=0.1*800=80, y=0.2*600=120, w=0.5*800=400, h=0.4*600=240
    expect(box.style.left).toBe('80px');
    expect(box.style.top).toBe('120px');
    expect(box.style.width).toBe('400px');
    expect(box.style.height).toBe('240px');
  });

  it('renders four corner resize handles', () => {
    render(<ViewportBox {...baseProps} />);
    expect(screen.getByLabelText('Resize top-left')).toBeInTheDocument();
    expect(screen.getByLabelText('Resize top-right')).toBeInTheDocument();
    expect(screen.getByLabelText('Resize bottom-left')).toBeInTheDocument();
    expect(screen.getByLabelText('Resize bottom-right')).toBeInTheDocument();
  });

  it('has orange border styling', () => {
    const { container } = render(<ViewportBox {...baseProps} />);
    const box = container.querySelector(
      '[data-testid="viewport-box"]',
    ) as HTMLElement;
    expect(box.className).toContain('border-orange');
  });

  it('renders nothing when container dimensions are zero', () => {
    const { container } = render(
      <ViewportBox {...baseProps} containerWidth={0} containerHeight={0} />,
    );
    expect(
      container.querySelector('[data-testid="viewport-box"]'),
    ).not.toBeInTheDocument();
  });

  it('calls onChange when box is dragged', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ViewportBox {...baseProps} onChange={onChange} />,
    );
    const box = container.querySelector(
      '[data-testid="viewport-box"]',
    ) as HTMLElement;

    fireEvent.mouseDown(box, { clientX: 280, clientY: 340 });
    fireEvent.mouseMove(document, { clientX: 300, clientY: 360 });
    fireEvent.mouseUp(document);

    expect(onChange).toHaveBeenCalled();
  });
});
