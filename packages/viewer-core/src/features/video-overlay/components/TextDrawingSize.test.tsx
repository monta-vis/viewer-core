import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextInputPopover } from './TextInputPopover';
import { ShapeRenderer, type ShapeData } from './ShapeRenderer';
// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const translations: Record<string, string> = {
        'textInput.placeholder': 'Enter text...',
        'textInput.hint': 'Press Enter to confirm',
        'textInput.small': 'S',
        'textInput.medium': 'M',
        'textInput.large': 'L',
        'common.confirm': 'Confirm',
        'common.cancel': 'Cancel',
      };
      return translations[key] || fallback || key;
    },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

describe('TextInputPopover size buttons', () => {
  const baseProps = {
    position: { x: 50, y: 50 },
    containerWidth: 800,
    containerHeight: 600,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders 3 size buttons (S, M, L)', () => {
    render(<TextInputPopover {...baseProps} />);
    expect(screen.getByText('S')).toBeTruthy();
    expect(screen.getByText('M')).toBeTruthy();
    expect(screen.getByText('L')).toBeTruthy();
  });

  it('has Medium selected by default', () => {
    render(<TextInputPopover {...baseProps} />);
    const mediumBtn = screen.getByText('M');
    // The selected button should have the primary background color class
    expect(mediumBtn.className).toContain('bg-[var(--color-primary)]');
  });

  it('clicking S selects Small, submit passes fontSize 3', () => {
    const onSubmit = vi.fn();
    render(<TextInputPopover {...baseProps} onSubmit={onSubmit} />);

    // Click Small
    fireEvent.click(screen.getByText('S'));

    // Type text and submit
    const input = screen.getByPlaceholderText('Enter text...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSubmit).toHaveBeenCalledWith('Hello', 3);
  });

  it('clicking L selects Large, submit passes fontSize 8', () => {
    const onSubmit = vi.fn();
    render(<TextInputPopover {...baseProps} onSubmit={onSubmit} />);

    // Click Large
    fireEvent.click(screen.getByText('L'));

    // Type text and submit via confirm button
    const input = screen.getByPlaceholderText('Enter text...');
    fireEvent.change(input, { target: { value: 'Big text' } });
    fireEvent.click(screen.getByLabelText('Confirm'));

    expect(onSubmit).toHaveBeenCalledWith('Big text', 8);
  });

  it('default submit (Medium) passes fontSize 5', () => {
    const onSubmit = vi.fn();
    render(<TextInputPopover {...baseProps} onSubmit={onSubmit} />);

    const input = screen.getByPlaceholderText('Enter text...');
    fireEvent.change(input, { target: { value: 'Medium text' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSubmit).toHaveBeenCalledWith('Medium text', 5);
  });
});

describe('ShapeRenderer text with foreignObject background', () => {
  const baseTextShape: ShapeData = {
    id: 'text-1',
    type: 'text',
    color: 'teal',
    strokeWidth: 2,
    x1: 10,
    y1: 20,
    x2: null,
    y2: null,
    text: 'Hello World',
  };

  it('renders foreignObject instead of SVG text elements', () => {
    const { container } = render(
      <svg>
        <ShapeRenderer
          shape={{ ...baseTextShape, fontSize: 5 }}
          containerWidth={1000}
          containerHeight={600}
        />
      </svg>,
    );
    // Should use foreignObject, not SVG <text>
    expect(container.querySelector('foreignObject')).toBeTruthy();
    expect(container.querySelectorAll('text').length).toBe(0);
  });

  it('text div has grey background style', () => {
    const { container } = render(
      <svg>
        <ShapeRenderer
          shape={{ ...baseTextShape, fontSize: 5 }}
          containerWidth={1000}
          containerHeight={600}
        />
      </svg>,
    );
    const bgDiv = container.querySelector('foreignObject > div') as HTMLElement;
    expect(bgDiv).toBeTruthy();
    expect(bgDiv.style.backgroundColor).toBe('rgba(30, 30, 30, 0.8)');
  });

  it('text span has white color and bold weight', () => {
    const { container } = render(
      <svg>
        <ShapeRenderer
          shape={{ ...baseTextShape, fontSize: 5 }}
          containerWidth={1000}
          containerHeight={600}
        />
      </svg>,
    );
    const span = container.querySelector('foreignObject span') as HTMLElement;
    expect(span).toBeTruthy();
    expect(span.style.color).toBe('white');
    expect(span.style.fontWeight).toBe('bold');
    expect(span.textContent).toBe('Hello World');
  });

  it('uses textScaleWidth for font size calculation', () => {
    const { container } = render(
      <svg>
        <ShapeRenderer
          shape={{ ...baseTextShape, fontSize: 5 }}
          containerWidth={1000}
          containerHeight={600}
          textScaleWidth={500}
        />
      </svg>,
    );
    // 5% of textScaleWidth 500 = 25px
    const span = container.querySelector('foreignObject span') as HTMLElement;
    expect(span.style.fontSize).toBe('25px');
  });

  it('falls back to containerWidth when textScaleWidth is undefined', () => {
    const { container } = render(
      <svg>
        <ShapeRenderer
          shape={{ ...baseTextShape, fontSize: 5 }}
          containerWidth={1000}
          containerHeight={600}
        />
      </svg>,
    );
    // 5% of 1000 = 50px
    const span = container.querySelector('foreignObject span') as HTMLElement;
    expect(span.style.fontSize).toBe('50px');
  });

  it('defaults to 5% when fontSize is null', () => {
    const { container } = render(
      <svg>
        <ShapeRenderer
          shape={{ ...baseTextShape, fontSize: null }}
          containerWidth={1000}
          containerHeight={600}
          textScaleWidth={700}
        />
      </svg>,
    );
    // Default 5% of 700 = 35px
    const span = container.querySelector('foreignObject span') as HTMLElement;
    expect(span.style.fontSize).toBe('35px');
  });

  it('shows selection outline when isSelected', () => {
    const { container } = render(
      <svg>
        <ShapeRenderer
          shape={{ ...baseTextShape, fontSize: 5 }}
          containerWidth={1000}
          containerHeight={600}
          isSelected={true}
        />
      </svg>,
    );
    const bgDiv = container.querySelector('foreignObject > div') as HTMLElement;
    expect(bgDiv.style.outline).toContain('rgba(0, 102, 204, 0.8)');
  });

  it('has border-radius that scales with font size', () => {
    const { container } = render(
      <svg>
        <ShapeRenderer
          shape={{ ...baseTextShape, fontSize: 5 }}
          containerWidth={1000}
          containerHeight={600}
        />
      </svg>,
    );
    const bgDiv = container.querySelector('foreignObject > div') as HTMLElement;
    // fontSize=50, padding=50*0.4=20, borderRadius=20px
    expect(bgDiv.style.borderRadius).toBe('20px');
  });
});

describe('createTextShape includes fontSize', () => {
  it('includes fontSize in output DrawnShape', async () => {
    // Test the pure logic: createTextShape produces a shape with fontSize
    // We import and call the hook's createTextShape function
    const { renderHook, act } = await import('@testing-library/react');
    const { useAnnotationDrawing } = await import('../hooks/useAnnotationDrawing');

    const onShapeCreate = vi.fn();

    const { result } = renderHook(() =>
      useAnnotationDrawing({
        tool: 'text',
        color: 'teal',
        onShapeCreate,
      }),
    );

    act(() => {
      result.current.createTextShape({ x: 50, y: 50 }, 'Test', 8);
    });

    expect(onShapeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'text',
        text: 'Test',
        fontSize: 8,
      }),
    );
  });

  it('createTextShape defaults fontSize to 5 when not provided', async () => {
    const { renderHook, act } = await import('@testing-library/react');
    const { useAnnotationDrawing } = await import('../hooks/useAnnotationDrawing');

    const onShapeCreate = vi.fn();

    const { result } = renderHook(() =>
      useAnnotationDrawing({
        tool: 'text',
        color: 'teal',
        onShapeCreate,
      }),
    );

    act(() => {
      result.current.createTextShape({ x: 50, y: 50 }, 'Test');
    });

    expect(onShapeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'text',
        text: 'Test',
        fontSize: 5,
      }),
    );
  });
});

describe('ShapeRenderer dark/light theme', () => {
  const makeShape = (color: string, type: 'arrow' | 'text' | 'rectangle' = 'rectangle'): ShapeData => ({
    id: 'shape-1',
    type,
    color: color as ShapeData['color'],
    strokeWidth: 2,
    x1: 10,
    y1: 20,
    x2: 50,
    y2: 60,
    text: type === 'text' ? 'Test' : null,
  });

  it('uses dark stroke for color=black', () => {
    const { container } = render(
      <svg>
        <ShapeRenderer shape={makeShape('black', 'rectangle')} containerWidth={1000} containerHeight={600} />
      </svg>,
    );
    const rect = container.querySelectorAll('rect')[1]; // visible stroke (second rect)
    expect(rect?.getAttribute('stroke')).toBe('rgba(30, 30, 30, 0.80)');
  });

  it('uses light stroke for color=white', () => {
    const { container } = render(
      <svg>
        <ShapeRenderer shape={makeShape('white', 'rectangle')} containerWidth={1000} containerHeight={600} />
      </svg>,
    );
    const rect = container.querySelectorAll('rect')[1]; // visible stroke (second rect)
    expect(rect?.getAttribute('stroke')).toBe('rgba(255, 255, 255, 0.80)');
  });

  it('text uses white text on dark bg for color=black', () => {
    const { container } = render(
      <svg>
        <ShapeRenderer shape={makeShape('black', 'text')} containerWidth={1000} containerHeight={600} />
      </svg>,
    );
    const bgDiv = container.querySelector('foreignObject > div') as HTMLElement;
    const span = container.querySelector('foreignObject span') as HTMLElement;
    expect(bgDiv.style.backgroundColor).toBe('rgba(30, 30, 30, 0.8)');
    expect(span.style.color).toBe('white');
  });

  it('text uses black text on light bg for color=white', () => {
    const { container } = render(
      <svg>
        <ShapeRenderer shape={makeShape('white', 'text')} containerWidth={1000} containerHeight={600} />
      </svg>,
    );
    const bgDiv = container.querySelector('foreignObject > div') as HTMLElement;
    const span = container.querySelector('foreignObject span') as HTMLElement;
    expect(bgDiv.style.backgroundColor).toBe('rgba(255, 255, 255, 0.8)');
    expect(span.style.color).toBe('black');
  });

  it('legacy colors (teal, red) default to dark theme', () => {
    const { container } = render(
      <svg>
        <ShapeRenderer shape={makeShape('teal', 'rectangle')} containerWidth={1000} containerHeight={600} />
      </svg>,
    );
    const rect = container.querySelectorAll('rect')[1]; // visible stroke (second rect)
    expect(rect?.getAttribute('stroke')).toBe('rgba(30, 30, 30, 0.80)');
  });
});

describe('TextInputPopover with initial values (edit mode)', () => {
  const baseProps = {
    position: { x: 50, y: 50 },
    containerWidth: 800,
    containerHeight: 600,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders with initialText pre-filled', () => {
    render(<TextInputPopover {...baseProps} initialText="Hello World" />);
    const input = screen.getByPlaceholderText('Enter text...') as HTMLInputElement;
    expect(input.value).toBe('Hello World');
  });

  it('renders with initialFontSize selected', () => {
    render(<TextInputPopover {...baseProps} initialFontSize={8} />);
    const largeBtn = screen.getByText('L');
    expect(largeBtn.className).toContain('bg-[var(--color-primary)]');
  });

  it('submits updated text on Enter', () => {
    const onSubmit = vi.fn();
    render(<TextInputPopover {...baseProps} onSubmit={onSubmit} initialText="Old text" initialFontSize={3} />);
    const input = screen.getByPlaceholderText('Enter text...');
    fireEvent.change(input, { target: { value: 'New text' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('New text', 3);
  });
});

describe('ShapeRenderer text double-click', () => {
  const textShape: ShapeData = {
    id: 'text-1',
    type: 'text',
    color: 'teal',
    strokeWidth: 2,
    x1: 10,
    y1: 20,
    x2: null,
    y2: null,
    text: 'Hello',
    fontSize: 5,
  };

  it('calls onDoubleClick when selected text shape is double-clicked', () => {
    const onDoubleClick = vi.fn();
    const { container } = render(
      <svg>
        <ShapeRenderer
          shape={textShape}
          containerWidth={1000}
          containerHeight={600}
          isSelected={true}
          onDoubleClick={onDoubleClick}
        />
      </svg>,
    );
    const div = container.querySelector('foreignObject > div') as HTMLElement;
    fireEvent.doubleClick(div);
    expect(onDoubleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onDoubleClick when not selected', () => {
    const onDoubleClick = vi.fn();
    const { container } = render(
      <svg>
        <ShapeRenderer
          shape={textShape}
          containerWidth={1000}
          containerHeight={600}
          isSelected={false}
          onDoubleClick={onDoubleClick}
        />
      </svg>,
    );
    const div = container.querySelector('foreignObject > div') as HTMLElement;
    fireEvent.doubleClick(div);
    expect(onDoubleClick).not.toHaveBeenCalled();
  });
});

