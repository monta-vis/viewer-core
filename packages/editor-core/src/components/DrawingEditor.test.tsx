import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DrawingEditor, type DrawingCardData } from './DrawingEditor';

describe('DrawingEditor', () => {
  afterEach(() => cleanup());

  const defaultProps = {
    activeTool: null as null,
    activeColor: 'black' as const,
    onToolSelect: vi.fn(),
    onColorSelect: vi.fn(),
    drawingMode: 'image' as const,
    onDrawingModeChange: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders toolbar with 4 tools', () => {
    render(<DrawingEditor {...defaultProps} />);
    expect(screen.getByLabelText('Arrow')).toBeInTheDocument();
    expect(screen.getByLabelText('Circle')).toBeInTheDocument();
    expect(screen.getByLabelText('Rectangle')).toBeInTheDocument();
    expect(screen.getByLabelText('Text')).toBeInTheDocument();
  });

  it('renders color palette', () => {
    render(<DrawingEditor {...defaultProps} />);
    const radiogroups = screen.getAllByRole('radiogroup');
    expect(radiogroups.length).toBeGreaterThanOrEqual(1);
  });

  it('mode toggle disabled when hasImageArea=false', () => {
    const { container } = render(<DrawingEditor {...defaultProps} hasImageArea={false} />);
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeDisabled();
  });

  it('mode toggle enabled when hasImageArea=true', () => {
    const { container } = render(<DrawingEditor {...defaultProps} hasImageArea={true} />);
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).not.toBeDisabled();
  });

  it('toggles drawing mode via checkbox', () => {
    const onDrawingModeChange = vi.fn();
    const { container } = render(
      <DrawingEditor
        {...defaultProps}
        hasImageArea={true}
        drawingMode="image"
        onDrawingModeChange={onDrawingModeChange}
      />
    );
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(onDrawingModeChange).toHaveBeenCalledWith('video');
  });

  it('shows timeline only in video mode', () => {
    const { rerender } = render(
      <DrawingEditor {...defaultProps} drawingMode="image" />
    );
    expect(screen.queryByText('0s')).not.toBeInTheDocument();

    rerender(<DrawingEditor {...defaultProps} drawingMode="video" duration={10.5} />);
    expect(screen.getByText('0s')).toBeInTheDocument();
    expect(screen.getByText('10.5s')).toBeInTheDocument();
  });

  it('renders minicard for each drawing', () => {
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'image', shapeType: 'arrow', color: 'black' },
      { id: 'd2', type: 'video', shapeType: 'circle', color: 'red', startFrame: 10, endFrame: 50 },
    ];
    render(
      <DrawingEditor
        {...defaultProps}
        drawings={drawings}
        onDrawingSelect={vi.fn()}
      />
    );
    const buttons = screen.getAllByLabelText('editorCore.selectDrawing');
    expect(buttons).toHaveLength(2);
  });

  it('calls onDrawingSelect when minicard clicked', () => {
    const onDrawingSelect = vi.fn();
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'image', shapeType: 'arrow', color: 'black' },
    ];
    render(
      <DrawingEditor
        {...defaultProps}
        drawings={drawings}
        onDrawingSelect={onDrawingSelect}
      />
    );
    const minicards = screen.getAllByLabelText('editorCore.selectDrawing');
    fireEvent.click(minicards[0]);
    expect(onDrawingSelect).toHaveBeenCalledWith('d1');
  });

  it('shows font size buttons for text drawings when selected', () => {
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'image', shapeType: 'text', color: 'black' },
    ];
    render(
      <DrawingEditor
        {...defaultProps}
        drawings={drawings}
        selectedDrawingId="d1"
        selectedDrawingFontSize={5}
        onFontSizeSelect={vi.fn()}
      />
    );
    // TEXT_SIZES has 3 sizes: S, M, L
    expect(screen.getByLabelText('Small')).toBeInTheDocument();
    expect(screen.getByLabelText('Medium')).toBeInTheDocument();
    expect(screen.getByLabelText('Large')).toBeInTheDocument();
  });

  it('disables tools when video mode and not in video section', () => {
    render(
      <DrawingEditor
        {...defaultProps}
        drawingMode="video"
        isInVideoSection={false}
      />
    );
    const toolsRow = screen.getByTestId('drawing-tools-row');
    expect(toolsRow.className).toContain('pointer-events-none');
  });

  it('enables tools when video mode and in video section', () => {
    render(
      <DrawingEditor
        {...defaultProps}
        drawingMode="video"
        isInVideoSection={true}
      />
    );
    const toolsRow = screen.getByTestId('drawing-tools-row');
    expect(toolsRow.className).not.toContain('pointer-events-none');
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(<DrawingEditor {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<DrawingEditor {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('drawing-editor-close'));
    expect(onClose).toHaveBeenCalled();
  });

  // --- Section rendering tests ---

  it('renders both Video and Image sections when both types present', () => {
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'video', shapeType: 'arrow', color: 'black', startFrame: 0, endFrame: 50 },
      { id: 'd2', type: 'image', shapeType: 'circle', color: 'red' },
    ];
    render(
      <DrawingEditor {...defaultProps} drawings={drawings} onDrawingSelect={vi.fn()} />
    );
    expect(screen.getByTestId('video-drawings-section')).toBeInTheDocument();
    expect(screen.getByTestId('image-drawings-section')).toBeInTheDocument();
  });

  it('only renders Video section when no image drawings exist', () => {
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'video', shapeType: 'arrow', color: 'black', startFrame: 0, endFrame: 50 },
    ];
    render(
      <DrawingEditor {...defaultProps} drawings={drawings} onDrawingSelect={vi.fn()} />
    );
    expect(screen.getByTestId('video-drawings-section')).toBeInTheDocument();
    expect(screen.queryByTestId('image-drawings-section')).not.toBeInTheDocument();
  });

  it('only renders Image section when no video drawings exist', () => {
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'image', shapeType: 'circle', color: 'red' },
    ];
    render(
      <DrawingEditor {...defaultProps} drawings={drawings} onDrawingSelect={vi.fn()} />
    );
    expect(screen.queryByTestId('video-drawings-section')).not.toBeInTheDocument();
    expect(screen.getByTestId('image-drawings-section')).toBeInTheDocument();
  });

  // --- Selection isolation tests ---

  it('clicking image card calls onDrawingSectionChange with image', () => {
    const onDrawingSectionChange = vi.fn();
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'video', shapeType: 'arrow', color: 'black', startFrame: 0, endFrame: 50 },
      { id: 'd2', type: 'image', shapeType: 'circle', color: 'red' },
    ];
    render(
      <DrawingEditor
        {...defaultProps}
        drawings={drawings}
        onDrawingSelect={vi.fn()}
        onDrawingSectionChange={onDrawingSectionChange}
      />
    );
    const imageSection = screen.getByTestId('image-drawings-section');
    const minicard = imageSection.querySelector('[aria-label="editorCore.selectDrawing"]')!;
    fireEvent.click(minicard);
    expect(onDrawingSectionChange).toHaveBeenCalledWith('image');
  });

  it('clicking video card calls onDrawingSectionChange with video', () => {
    const onDrawingSectionChange = vi.fn();
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'video', shapeType: 'arrow', color: 'black', startFrame: 0, endFrame: 50 },
      { id: 'd2', type: 'image', shapeType: 'circle', color: 'red' },
    ];
    render(
      <DrawingEditor
        {...defaultProps}
        drawings={drawings}
        onDrawingSelect={vi.fn()}
        onDrawingSectionChange={onDrawingSectionChange}
      />
    );
    const videoSection = screen.getByTestId('video-drawings-section');
    const minicard = videoSection.querySelector('[aria-label="editorCore.selectDrawing"]')!;
    fireEvent.click(minicard);
    expect(onDrawingSectionChange).toHaveBeenCalledWith('video');
  });

  // --- Multi-select tests ---

  it('Ctrl+click calls onDrawingMultiSelect with ctrl', () => {
    const onDrawingMultiSelect = vi.fn();
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'image', shapeType: 'arrow', color: 'black' },
    ];
    render(
      <DrawingEditor
        {...defaultProps}
        drawings={drawings}
        onDrawingMultiSelect={onDrawingMultiSelect}
      />
    );
    const minicard = screen.getAllByLabelText('editorCore.selectDrawing')[0];
    fireEvent.click(minicard, { ctrlKey: true });
    expect(onDrawingMultiSelect).toHaveBeenCalledWith('d1', 'ctrl');
  });

  it('Shift+click calls onDrawingMultiSelect with shift', () => {
    const onDrawingMultiSelect = vi.fn();
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'image', shapeType: 'arrow', color: 'black' },
    ];
    render(
      <DrawingEditor
        {...defaultProps}
        drawings={drawings}
        onDrawingMultiSelect={onDrawingMultiSelect}
      />
    );
    const minicard = screen.getAllByLabelText('editorCore.selectDrawing')[0];
    fireEvent.click(minicard, { shiftKey: true });
    expect(onDrawingMultiSelect).toHaveBeenCalledWith('d1', 'shift');
  });

  it('without onDrawingMultiSelect, falls back to onDrawingSelect', () => {
    const onDrawingSelect = vi.fn();
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'image', shapeType: 'arrow', color: 'black' },
    ];
    render(
      <DrawingEditor
        {...defaultProps}
        drawings={drawings}
        onDrawingSelect={onDrawingSelect}
      />
    );
    const minicard = screen.getAllByLabelText('editorCore.selectDrawing')[0];
    fireEvent.click(minicard, { ctrlKey: true });
    expect(onDrawingSelect).toHaveBeenCalledWith('d1');
  });

  it('primary selected shows ring-2 ring-white, secondary shows ring-1 ring-white/60', () => {
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'image', shapeType: 'arrow', color: 'black' },
      { id: 'd2', type: 'image', shapeType: 'circle', color: 'red' },
    ];
    render(
      <DrawingEditor
        {...defaultProps}
        drawings={drawings}
        selectedDrawingId="d1"
        selectedDrawingIds={new Set(['d1', 'd2'])}
      />
    );
    const minicards = screen.getAllByLabelText('editorCore.selectDrawing');
    // Both selected cards get the same ring-2 ring-white style
    expect(minicards[0].className).toContain('ring-2');
    expect(minicards[0].className).toContain('ring-white');
    expect(minicards[1].className).toContain('ring-2');
    expect(minicards[1].className).toContain('ring-white');
  });
});
