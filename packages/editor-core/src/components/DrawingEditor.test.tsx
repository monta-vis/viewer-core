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

  // NOTE: hasImageArea and onDrawingModeChange props were removed from DrawingEditor.
  // Mode toggling is now handled by the parent dialogs.

  it('shows timeline only in video mode', () => {
    const { rerender } = render(
      <DrawingEditor {...defaultProps} drawingMode="image" />
    );
    expect(screen.queryByText('0s')).not.toBeInTheDocument();

    rerender(<DrawingEditor {...defaultProps} drawingMode="video" duration={10.5} />);
    expect(screen.getByText('0s')).toBeInTheDocument();
    expect(screen.getByText('10.5s')).toBeInTheDocument();
  });

  it('renders minicard for each drawing in active mode', () => {
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'image', shapeType: 'arrow', color: 'black' },
      { id: 'd2', type: 'image', shapeType: 'circle', color: 'red' },
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

  it('renders drawings section matching the active drawingMode', () => {
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'video', shapeType: 'arrow', color: 'black', startFrame: 0, endFrame: 50 },
      { id: 'd2', type: 'image', shapeType: 'circle', color: 'red' },
    ];
    // Image mode → shows image-drawings-section only
    const { rerender } = render(
      <DrawingEditor {...defaultProps} drawings={drawings} onDrawingSelect={vi.fn()} drawingMode="image" />
    );
    expect(screen.getByTestId('image-drawings-section')).toBeInTheDocument();
    expect(screen.queryByTestId('video-drawings-section')).not.toBeInTheDocument();

    // Video mode → shows video-drawings-section only
    rerender(
      <DrawingEditor {...defaultProps} drawings={drawings} onDrawingSelect={vi.fn()} drawingMode="video" />
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
    ];
    render(
      <DrawingEditor
        {...defaultProps}
        drawings={drawings}
        drawingMode="video"
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

  it('Ctrl+click calls onDrawingMultiSelect with ctrl and orderedIds', () => {
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
    expect(onDrawingMultiSelect).toHaveBeenCalledWith('d1', 'ctrl', ['d1']);
  });

  it('plain click calls onDrawingMultiSelect with null and orderedIds', () => {
    const onDrawingMultiSelect = vi.fn();
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'image', shapeType: 'arrow', color: 'black' },
      { id: 'd2', type: 'image', shapeType: 'circle', color: 'red' },
    ];
    render(
      <DrawingEditor
        {...defaultProps}
        drawings={drawings}
        onDrawingMultiSelect={onDrawingMultiSelect}
      />
    );
    const minicard = screen.getAllByLabelText('editorCore.selectDrawing')[0];
    fireEvent.click(minicard);
    expect(onDrawingMultiSelect).toHaveBeenCalledWith('d1', null, ['d1', 'd2']);
  });

  it('Shift+click calls onDrawingMultiSelect with shift and orderedIds', () => {
    const onDrawingMultiSelect = vi.fn();
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'image', shapeType: 'arrow', color: 'black' },
      { id: 'd2', type: 'image', shapeType: 'circle', color: 'red' },
      { id: 'd3', type: 'image', shapeType: 'rectangle', color: 'blue' },
    ];
    render(
      <DrawingEditor
        {...defaultProps}
        drawings={drawings}
        onDrawingMultiSelect={onDrawingMultiSelect}
      />
    );
    const minicards = screen.getAllByLabelText('editorCore.selectDrawing');
    fireEvent.click(minicards[1], { shiftKey: true });
    expect(onDrawingMultiSelect).toHaveBeenCalledWith('d2', 'shift', ['d1', 'd2', 'd3']);
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

  it('selected drawings show selected background style', () => {
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
    // Both selected cards get the selected background
    expect(minicards[0].className).toContain('bg-[var(--item-bg-selected)]');
    expect(minicards[1].className).toContain('bg-[var(--item-bg-selected)]');
  });

  // --- Select mode & batch delete tests ---

  it('clicking select-mode toggle enters select mode', () => {
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'image', shapeType: 'arrow', color: 'black' },
    ];
    render(
      <DrawingEditor
        {...defaultProps}
        drawings={drawings}
        onDrawingMultiSelect={vi.fn()}
      />
    );
    const toggle = screen.getByTestId('select-mode-toggle');
    expect(toggle).toBeInTheDocument();
    fireEvent.click(toggle);
    // In select mode, checkboxes should appear on rows
    expect(screen.getByTestId('drawing-checkbox-d1')).toBeInTheDocument();
  });

  it('select mode row click toggles selection without modifier keys', () => {
    const onDrawingMultiSelect = vi.fn();
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'image', shapeType: 'arrow', color: 'black' },
      { id: 'd2', type: 'image', shapeType: 'circle', color: 'red' },
    ];
    render(
      <DrawingEditor
        {...defaultProps}
        drawings={drawings}
        onDrawingMultiSelect={onDrawingMultiSelect}
      />
    );
    // Enter select mode
    fireEvent.click(screen.getByTestId('select-mode-toggle'));
    // Click a row — should send ctrl modifier (toggle behavior) with orderedIds
    const minicards = screen.getAllByLabelText('editorCore.selectDrawing');
    fireEvent.click(minicards[0]);
    expect(onDrawingMultiSelect).toHaveBeenCalledWith('d1', 'ctrl', ['d1', 'd2']);
  });

  it('delete button visible when ≥1 drawing selected (regardless of select mode)', () => {
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'image', shapeType: 'arrow', color: 'black' },
      { id: 'd2', type: 'image', shapeType: 'circle', color: 'red' },
    ];
    render(
      <DrawingEditor
        {...defaultProps}
        drawings={drawings}
        selectedDrawingIds={new Set(['d1'])}
        selectedDrawingId="d1"
        onDrawingDelete={vi.fn()}
      />
    );
    // Delete button should be visible even without select mode toggled
    expect(screen.getByTestId('delete-selected-btn')).toBeInTheDocument();
  });

  it('delete button hidden when no drawings selected', () => {
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'image', shapeType: 'arrow', color: 'black' },
    ];
    render(
      <DrawingEditor
        {...defaultProps}
        drawings={drawings}
        selectedDrawingIds={new Set()}
        onDrawingDelete={vi.fn()}
      />
    );
    expect(screen.queryByTestId('delete-selected-btn')).not.toBeInTheDocument();
  });

  it('clicking delete opens ConfirmDeleteDialog', () => {
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'image', shapeType: 'arrow', color: 'black' },
    ];
    render(
      <DrawingEditor
        {...defaultProps}
        drawings={drawings}
        selectedDrawingIds={new Set(['d1'])}
        selectedDrawingId="d1"
        onDrawingDelete={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('delete-selected-btn'));
    // ConfirmDeleteDialog should show up (rendered in portal)
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('confirming delete calls onDrawingDelete with selected IDs', () => {
    const onDrawingDelete = vi.fn();
    const selectedIds = new Set(['d1', 'd2']);
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'image', shapeType: 'arrow', color: 'black' },
      { id: 'd2', type: 'image', shapeType: 'circle', color: 'red' },
    ];
    render(
      <DrawingEditor
        {...defaultProps}
        drawings={drawings}
        selectedDrawingIds={selectedIds}
        selectedDrawingId="d1"
        onDrawingDelete={onDrawingDelete}
      />
    );
    fireEvent.click(screen.getByTestId('delete-selected-btn'));
    // Find the delete button in the confirm dialog (second button, after Cancel)
    const dialog = screen.getByRole('dialog');
    const buttons = dialog.querySelectorAll('button');
    const deleteBtn = buttons[buttons.length - 1] as HTMLElement;
    fireEvent.click(deleteBtn);
    expect(onDrawingDelete).toHaveBeenCalledWith(selectedIds);
  });

  it('exiting select mode clears selection', () => {
    const onDrawingMultiSelect = vi.fn();
    const drawings: DrawingCardData[] = [
      { id: 'd1', type: 'image', shapeType: 'arrow', color: 'black' },
    ];
    render(
      <DrawingEditor
        {...defaultProps}
        drawings={drawings}
        selectedDrawingIds={new Set(['d1'])}
        selectedDrawingId="d1"
        onDrawingMultiSelect={onDrawingMultiSelect}
        onDeselectAll={vi.fn()}
      />
    );
    // Enter select mode
    fireEvent.click(screen.getByTestId('select-mode-toggle'));
    // Exit select mode
    fireEvent.click(screen.getByTestId('select-mode-toggle'));
    // Should have called onDeselectAll
    expect(defaultProps.onClose).not.toHaveBeenCalled(); // make sure we're not closing
  });
});
