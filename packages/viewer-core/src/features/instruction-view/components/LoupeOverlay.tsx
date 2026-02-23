interface LoupeOverlayProps {
  /** Pointer X relative to container */
  pointerX: number;
  /** Pointer Y relative to container */
  pointerY: number;
  /** Image source (dataUrl or URL) */
  imageSrc: string;
  /** Current size of the container div */
  containerSize: { width: number; height: number };
  /** Content bounds as percentages (from computeContentBounds) */
  contentBounds: { x: number; y: number; width: number; height: number };
  /** Zoom factor (default 3) */
  zoom?: number;
  /** Half-size of the square loupe in px (default 240 → 480x480) */
  halfSize?: number;
}

/**
 * Square magnifying glass overlay.
 * Shows a zoomed-in view of the image at the pointer position.
 * Pointer-events are disabled so it doesn't interfere with gestures.
 */
export function LoupeOverlay({
  pointerX,
  pointerY,
  imageSrc,
  containerSize,
  contentBounds,
  zoom = 3,
  halfSize = 240,
}: LoupeOverlayProps) {
  const size = halfSize * 2;

  // Center loupe on pointer, clamp to container edges
  const loupeX = Math.max(0, Math.min(pointerX - halfSize, containerSize.width - size));
  const loupeY = Math.max(0, Math.min(pointerY - halfSize, containerSize.height - size));

  // Content bounds in pixels
  const boundsX = (contentBounds.x / 100) * containerSize.width;
  const boundsY = (contentBounds.y / 100) * containerSize.height;
  const boundsW = (contentBounds.width / 100) * containerSize.width;
  const boundsH = (contentBounds.height / 100) * containerSize.height;

  // Pointer position as fraction of natural image (0..1)
  const fracX = (pointerX - boundsX) / boundsW;
  const fracY = (pointerY - boundsY) / boundsH;

  // The zoomed image: scale the natural image so that each pixel in the
  // rendered content area becomes `zoom` CSS pixels.
  const imgW = boundsW * zoom;
  const imgH = boundsH * zoom;

  // Offset the image so the point under the pointer maps to the loupe center.
  // The point at fracX in the zoomed image is at fracX * imgW pixels from left.
  // We want that at halfSize (center of loupe).
  const imgLeft = halfSize - fracX * imgW;
  const imgTop = halfSize - fracY * imgH;

  return (
    <div
      data-testid="loupe-overlay"
      className="absolute pointer-events-none z-30 ring-2 ring-white/80 shadow-xl"
      style={{
        left: `${loupeX}px`,
        top: `${loupeY}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '0.75rem',
        overflow: 'hidden',
      }}
    >
      <img
        src={imageSrc}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          left: `${imgLeft}px`,
          top: `${imgTop}px`,
          width: `${imgW}px`,
          height: `${imgH}px`,
          maxWidth: 'none',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
