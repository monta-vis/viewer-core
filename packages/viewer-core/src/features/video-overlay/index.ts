/**
 * Video Overlay Feature
 *
 * Unified feature for all overlay elements on video:
 * - Areas (VideoFrameAreas, Viewport) - HTML-based rectangles
 * - Shapes (Annotations, Drawings) - SVG-based shapes
 * - Drawing tools and color palette
 */

// ============================================
// Core Unified Components (new)
// ============================================

export { SelectionHandle } from './components/SelectionHandle';
export { ShapeRenderer, type ShapeData } from './components/ShapeRenderer';
export { ShapeLayer } from './components/ShapeLayer';

// ============================================
// Specialized Components (thin wrappers)
// ============================================

export { VideoOverlay } from './components/VideoOverlay';
export { AreaHighlight } from './components/AreaHighlight';
export { AreaContextMenu } from './components/AreaContextMenu';
export type { AreaContextMenuProps } from './components/AreaContextMenu';
export { AnnotationRenderer } from './components/AnnotationRenderer';
export { AnnotationLayer } from './components/AnnotationLayer';
export { DrawingRenderer } from './components/DrawingRenderer';
export { DrawingLayer } from './components/DrawingLayer';
export { DrawingPreview } from './components/DrawingPreview';
export { DrawingToolbar } from './components/DrawingToolbar';
export { ColorPalette } from './components/ColorPalette';
export { TextInputPopover } from './components/TextInputPopover';

// ============================================
// Core Unified Hooks (new)
// ============================================

export {
  useShapeResize,
  type ShapeCoords,
  type ResizableShape,
  type ShapeResizeState,
} from './hooks/useShapeResize';

// ============================================
// Specialized Hooks (thin wrappers)
// ============================================

export { useAreaSelection } from './hooks/useAreaSelection';
export { useAreaResize } from './hooks/useAreaResize';
export { useVideoBounds, type VideoBounds } from './hooks/useVideoBounds';
export {
  useVideoFrameAreaManager,
  type UseVideoFrameAreaManagerProps,
  type UseVideoFrameAreaManagerReturn,
  type CreateAreaResult,
} from './hooks/useVideoFrameAreaManager';
export { useAnnotationDrawing } from './hooks/useAnnotationDrawing';
export { useAnnotationResize, type AnnotationResizeState } from './hooks/useAnnotationResize';
export { useDrawingResize, type DrawingResizeState } from './hooks/useDrawingResize';

// ============================================
// Types
// ============================================

// ShapeType and ShapeColor are canonical in @/features/instruction.
// They are intentionally NOT re-exported here to avoid ambiguity
// when the root index.ts uses `export *` for both features.
export type {
  Rectangle,
  Point,
  VideoBoundsOverride,
  AreaType,
  AreaData,
  AreaResizeHandle,
  ShapeHandleType,
  DrawingState,
  OverlayMode,
  DrawnShape,
} from './types';

export {
  AREA_COLORS,
  SHAPE_COLORS,
  AREA_HANDLE_CURSORS,
  getShapeColorValue,
  initialDrawingState,
} from './types';

// ============================================
// Utils
// ============================================

export { rectToNormalized, normalizedToRect, type NormalizedRect } from './utils/coordinates';

// ============================================
// Backwards Compatibility Aliases
// ============================================

// From canvas-overlay
export { VideoOverlay as CanvasOverlay } from './components/VideoOverlay';
export type { AreaData as VideoFrameAreaData } from './types';
export type { AreaResizeHandle as ResizeHandle } from './types';
export type { OverlayMode as DrawingMode } from './types';

// From drawing-tools
export type { ShapeType as AnnotationType } from './types';
export type { ShapeColor as AnnotationColor } from './types';
export type { ShapeHandleType as AnnotationHandleType } from './types';
export type { ShapeHandleType as DrawingHandleType } from './types';
export { SHAPE_COLORS as ANNOTATION_COLORS } from './types';
export { TEXT_SIZES } from './types';
