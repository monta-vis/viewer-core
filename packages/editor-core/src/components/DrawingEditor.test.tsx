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
});
