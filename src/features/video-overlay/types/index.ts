/**
 * Video Overlay Types
 *
 * Unified types for all overlay elements:
 * - Areas (VideoFrameAreas, Viewport) - HTML-based rectangles
 * - Shapes (Annotations, Drawings) - SVG-based shapes
 */

// ============================================
// Geometry Types
// ============================================

/**
 * Rectangle coordinates as percentages (0-100)
 */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Point coordinates as percentages (0-100)
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Video bounds within a container (pixels).
 * Used to calculate coordinates relative to the actual video area
 * (excluding letterbox bars).
 */
export interface VideoBoundsOverride {
  /** X offset from container left edge (pixels) */
  x: number;
  /** Y offset from container top edge (pixels) */
  y: number;
  /** Width of the video area (pixels) */
  width: number;
  /** Height of the video area (pixels) */
  height: number;
}

// ============================================
// Area Types (HTML-based rectangles)
// ============================================

/**
 * Area types for VideoFrameAreas
 */
export type AreaType = 'SubstepImage' | 'PartToolScan' | 'TextScan' | 'CodeScan' | 'Viewport';

/**
 * Data for rendering an area highlight
 */
export interface AreaData {
  id: string;
  /** X position as percentage (0-100) */
  x: number;
  /** Y position as percentage (0-100) */
  y: number;
  /** Width as percentage */
  width: number;
  /** Height as percentage */
  height: number;
  /** Area type for styling */
  type?: AreaType;
  /** Optional label */
  label?: string;
  /** Optional color override (overrides type-based color) */
  color?: string;
}

/**
 * PowerPoint-style 8 resize handles + move
 */
export type AreaResizeHandle =
  | 'topLeft' | 'top' | 'topRight'
  | 'left' | 'right'
  | 'bottomLeft' | 'bottom' | 'bottomRight'
  | 'move';

// ============================================
// Shape Types (SVG-based shapes)
// ============================================

// Canonical definitions live in @/features/instruction/types/enriched.ts
// Import for local use + re-export for consumers
import type { ShapeType as _ShapeType, ShapeColor as _ShapeColor } from '@/features/instruction';
export type ShapeType = _ShapeType;
export type ShapeColor = _ShapeColor;

/**
 * Handle types for shape resize/move
 */
export type ShapeHandleType =
  | 'move'  // Move entire shape
  | 'start' | 'end'  // For arrows
  | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';  // For rectangles and circles

/**
 * Generic shape geometry returned by drawing hooks.
 * Contains only shape geometry, no DB-specific IDs.
 * The caller converts this to DrawingRow with appropriate IDs.
 *
 * ┌───────────────────────────────────────────────────────────────────────────┐
 * │ SHAPE COORDINATE SEMANTICS                                                │
 * ├───────────────────────────────────────────────────────────────────────────┤
 * │ All coordinates are in Video-Local Space (0-100% of video area)           │
 * │                                                                            │
 * │ Rectangle/Circle:                                                          │
 * │   x1, y1 = top-left corner (or bounding box top-left for circle)          │
 * │   x2, y2 = bottom-right corner (or bounding box bottom-right)             │
 * │                                                                            │
 * │ Arrow/Line:                                                                │
 * │   x1, y1 = start point (arrow tail)                                       │
 * │   x2, y2 = end point (arrow head)                                         │
 * │                                                                            │
 * │ Text:                                                                      │
 * │   x1, y1 = anchor point (top-left of text)                                │
 * │   x2, y2 = null (not used)                                                │
 * │                                                                            │
 * │ Freehand:                                                                  │
 * │   x1, y1 = bounding box top-left                                          │
 * │   x2, y2 = bounding box bottom-right                                      │
 * │   points = JSON array of {x, y} normalized to bounding box                │
 * │                                                                            │
 * └───────────────────────────────────────────────────────────────────────────┘
 */
export interface DrawnShape {
  type: ShapeType;
  color: ShapeColor;
  strokeWidth: number;
  x1: number;
  y1: number;
  x2: number | null;
  y2: number | null;
  text: string | null;
  /** Font size as percentage of container width (text shapes only). Default: 5 */
  fontSize?: number;
}

/**
 * Drawing state for active drawing operation
 */
export interface DrawingState {
  tool: ShapeType | null;
  color: ShapeColor;
  isDrawing: boolean;
  startPoint: Point | null;
  currentPoint: Point | null;
}

// ============================================
// Overlay Mode
// ============================================

/**
 * Current overlay interaction mode
 */
export type OverlayMode = 'none' | 'area' | 'partToolScan' | 'annotation' | 'viewport';

// ============================================
// Color Constants
// ============================================

/**
 * Color mapping for area types
 */
export const AREA_COLORS: Record<AreaType, string> = {
  SubstepImage: 'hsla(200, 70%, 50%, 1)',   // Blue
  PartToolScan: 'hsla(45, 100%, 50%, 1)',   // Yellow
  TextScan: 'hsla(280, 60%, 50%, 1)',       // Purple
  CodeScan: 'hsla(150, 60%, 40%, 1)',       // Green
  Viewport: 'hsla(185, 70%, 50%, 1)',       // Cyan (brand color)
};

/**
 * Color mapping for shapes (CSS variable names)
 */
export const SHAPE_COLORS: Record<ShapeColor, string> = {
  teal: 'var(--color-secondary)',
  yellow: 'var(--color-accent)',
  red: 'var(--color-error)',
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  purple: '#a855f7',
  black: '#000000',
  white: '#ffffff',
};

/**
 * Resolved hex values for shape colors (used in SVG rendering where CSS variables don't work)
 */
const SHAPE_COLOR_HEX: Record<ShapeColor, string> = {
  teal: '#14b8a6',
  yellow: '#eab308',
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  purple: '#a855f7',
  black: '#000000',
  white: '#ffffff',
};

/**
 * Get resolved hex color value for a shape color name.
 * Falls back to the input string if not a known ShapeColor, or teal as default.
 */
export function getShapeColorValue(color: string): string {
  return SHAPE_COLOR_HEX[color as ShapeColor] || color || '#14b8a6';
}

/**
 * Cursor for each area resize handle position
 */
export const AREA_HANDLE_CURSORS: Record<AreaResizeHandle, string> = {
  topLeft: 'nwse-resize',
  top: 'ns-resize',
  topRight: 'nesw-resize',
  left: 'ew-resize',
  right: 'ew-resize',
  bottomLeft: 'nesw-resize',
  bottom: 'ns-resize',
  bottomRight: 'nwse-resize',
  move: 'move',
};

// ============================================
// Text Size Presets
// ============================================

/** Font size options for text shapes (fontSize as % of container width) */
export const TEXT_SIZES = [
  { label: 'S', value: 3, ariaLabel: 'Small' },
  { label: 'M', value: 5, ariaLabel: 'Medium' },
  { label: 'L', value: 8, ariaLabel: 'Large' },
] as const;

// ============================================
// Initial States
// ============================================

export const initialDrawingState: DrawingState = {
  tool: null,
  color: 'teal',
  isDrawing: false,
  startPoint: null,
  currentPoint: null,
};
