import type { Rectangle, Point } from '../types';

/**
 * Coordinate Transformation Utilities
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ COORDINATE SYSTEMS OVERVIEW                                                  │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                              │
 * │ 1. Storage Space (0-1 normalized)                                           │
 * │    - Used for: Viewport keyframes in database                               │
 * │    - Range: 0.0 to 1.0                                                      │
 * │    - Relative to: Video area (excluding letterbox)                          │
 * │                                                                              │
 * │ 2. Video-Local Space (0-100%)                                               │
 * │    - Used for: VideoFrameAreas, Drawings, Viewport rendering                │
 * │    - Range: 0% to 100%                                                      │
 * │    - Relative to: Actual video area (not letterbox regions)                 │
 * │    - Note: Areas/shapes use this for position & size                        │
 * │                                                                              │
 * │ 3. Container Space (pixels)                                                 │
 * │    - Used for: DOM positioning, mouse events                                │
 * │    - Range: 0 to container.width/height in pixels                           │
 * │    - Relative to: Full overlay container (includes letterbox)               │
 * │                                                                              │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ TRANSFORMATION FLOW                                                          │
 * │                                                                              │
 * │   Storage (0-1) ←→ Video-Local (0-100%) ←→ Container (pixels)               │
 * │       ↑                    ↑                      ↑                         │
 * │   DB/API              Rendering              DOM Events                     │
 * │                                                                              │
 * │ Functions:                                                                   │
 * │   containerToLocalSpace() - Container % → Local (0-1)                       │
 * │   localSpaceToContainer() - Local (0-1) → Container %                       │
 * │   pointContainerToLocal() - Transform point with bounds                     │
 * │   pointLocalToContainer() - Transform point with bounds                     │
 * │                                                                              │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

/**
 * Transform a single coordinate from Container-Space (0-100%) to Local-Space (0-1)
 *
 * @param containerCoord - Coordinate in container space (0-100%)
 * @param boundsStart - Start position of the local space in container space
 * @param boundsSize - Size of the local space in container space
 * @returns Coordinate in local space (0-1)
 */
export function containerToLocalSpace(
  containerCoord: number,
  boundsStart: number,
  boundsSize: number
): number {
  if (boundsSize === 0) return 0;
  return (containerCoord - boundsStart) / boundsSize;
}

/**
 * Transform a single coordinate from Local-Space (0-1) to Container-Space (0-100%)
 *
 * @param localCoord - Coordinate in local space (0-1)
 * @param boundsStart - Start position of the local space in container space
 * @param boundsSize - Size of the local space in container space
 * @returns Coordinate in container space (0-100%)
 */
export function localSpaceToContainer(
  localCoord: number,
  boundsStart: number,
  boundsSize: number
): number {
  return boundsStart + (localCoord * boundsSize);
}

/**
 * Transform a point from Container-Space (0-100%) to Local-Space (0-1)
 *
 * @param point - Point in container space
 * @param bounds - Rectangle defining the local space in container space
 * @returns Point in local space (0-1)
 */
export function pointContainerToLocal(point: Point, bounds: Rectangle): Point {
  return {
    x: containerToLocalSpace(point.x, bounds.x, bounds.width),
    y: containerToLocalSpace(point.y, bounds.y, bounds.height),
  };
}

/**
 * Transform a point from Local-Space (0-1) to Container-Space (0-100%)
 *
 * @param point - Point in local space (0-1)
 * @param bounds - Rectangle defining the local space in container space
 * @returns Point in container space (0-100%)
 */
export function pointLocalToContainer(point: Point, bounds: Rectangle): Point {
  return {
    x: localSpaceToContainer(point.x, bounds.x, bounds.width),
    y: localSpaceToContainer(point.y, bounds.y, bounds.height),
  };
}

/**
 * Clamp a local-space coordinate to valid range (0-1)
 */
export function clampToLocalSpace(coord: number): number {
  return Math.max(0, Math.min(1, coord));
}

/**
 * Clamp a point to valid local-space range (0-1)
 */
export function clampPointToLocalSpace(point: Point): Point {
  return {
    x: clampToLocalSpace(point.x),
    y: clampToLocalSpace(point.y),
  };
}
