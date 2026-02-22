/**
 * Compute the bounds of an object-contain image/canvas within its container.
 * Returns bounds as percentages (0-100) of the container, suitable for ShapeLayer.
 * Returns null if any dimension is zero.
 */
export function computeContentBounds(
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number,
): { x: number; y: number; width: number; height: number } | null {
  if (!containerWidth || !containerHeight || !naturalWidth || !naturalHeight) {
    return null;
  }

  const contentAspect = naturalWidth / naturalHeight;
  const containerAspect = containerWidth / containerHeight;

  let renderWidth: number;
  let renderHeight: number;

  if (contentAspect > containerAspect) {
    // Content is wider → fills width, letterboxed vertically
    renderWidth = containerWidth;
    renderHeight = containerWidth / contentAspect;
  } else {
    // Content is taller → fills height, letterboxed horizontally
    renderHeight = containerHeight;
    renderWidth = containerHeight * contentAspect;
  }

  const offsetX = (containerWidth - renderWidth) / 2;
  const offsetY = (containerHeight - renderHeight) / 2;

  return {
    x: (offsetX / containerWidth) * 100,
    y: (offsetY / containerHeight) * 100,
    width: (renderWidth / containerWidth) * 100,
    height: (renderHeight / containerHeight) * 100,
  };
}
