import type { DrawingRow } from '@/features/instruction';

interface RenderImageWithDrawingsOptions {
  imageUrl: string;
  drawings: DrawingRow[];
  width: number;
  height: number;
}

/**
 * Converts an image URL to a base64 data URL by fetching raw bytes.
 * Uses fetch() to bypass CORS restrictions with custom protocols (e.g. mvis-media://).
 */
async function imageUrlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`[imageUrlToDataUrl] Fetch failed (${response.status}): ${url}`);
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('[imageUrlToDataUrl] FileReader did not produce a string'));
      }
    };
    reader.onerror = () => reject(new Error(`[imageUrlToDataUrl] FileReader failed: ${url}`));
    reader.readAsDataURL(blob);
  });
}

/** Promise wrapper for Image loading */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`[loadImage] Failed to load: ${src.substring(0, 60)}`));
    img.src = src;
  });
}

/**
 * Renders an image with drawing annotations baked in using Canvas 2D API.
 *
 * Draws the image on a canvas, then renders each shape annotation directly.
 * Falls back to the plain imageUrl if rendering fails.
 */
export async function renderImageWithDrawings(
  options: RenderImageWithDrawingsOptions,
): Promise<string> {
  const { imageUrl, drawings, width } = options;
  if (drawings.length === 0) {
    return imageUrl;
  }

  console.debug(`[renderImageWithDrawings] Called with ${drawings.length} drawings, imageUrl=${imageUrl.substring(0, 80)}`);

  try {
    let base64Url: string;
    try {
      base64Url = await imageUrlToDataUrl(imageUrl);
      console.debug(`[renderImageWithDrawings] Base64 conversion OK (${base64Url.length} chars)`);
    } catch (fetchErr) {
      console.error('[renderImageWithDrawings] Failed to fetch/convert image to base64:', fetchErr);
      return imageUrl;
    }

    const img = await loadImage(base64Url);

    // Size canvas to requested width, preserve aspect ratio
    const aspectRatio = img.naturalHeight / img.naturalWidth;
    const canvasW = width;
    const canvasH = Math.round(width * aspectRatio);

    const pixelRatio = 2;
    const canvas = document.createElement('canvas');
    canvas.width = canvasW * pixelRatio;
    canvas.height = canvasH * pixelRatio;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[renderImageWithDrawings] Failed to get 2D context');
      return imageUrl;
    }
    ctx.scale(pixelRatio, pixelRatio);

    // Draw base image filling entire canvas (no letterboxing)
    ctx.drawImage(img, 0, 0, canvasW, canvasH);

    // Draw each annotation using normalized 0–1 coords → canvas pixel space
    for (const d of drawings) {
      renderDrawingToCanvas(ctx, d, canvasW, canvasH);
    }

    const dataUrl = canvas.toDataURL('image/png');
    console.debug(`[renderImageWithDrawings] Canvas render success (${dataUrl.length} chars)`);
    return dataUrl;
  } catch (err) {
    console.error('[renderImageWithDrawings] Failed to render, falling back to plain image. Error:', err);
    return imageUrl;
  }
}

/** Map ShapeColor names to hex values (matches getShapeColorValue in video-overlay) */
const COLOR_MAP: Record<string, string> = {
  teal: '#0d9488',
  yellow: '#eab308',
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  purple: '#a855f7',
  black: '#000000',
  white: '#ffffff',
};

function resolveColor(color: string): string {
  return COLOR_MAP[color] ?? color;
}

function renderDrawingToCanvas(
  ctx: CanvasRenderingContext2D,
  d: DrawingRow,
  w: number,
  h: number,
): void {
  const color = resolveColor(d.color);
  const strokeWidth = (d.strokeWidth ?? 2) * 2; // Scale up for print

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth;

  switch (d.type) {
    case 'arrow': {
      if (d.x1 === null || d.y1 === null || d.x2 === null || d.y2 === null) return;
      const x1 = d.x1 * w, y1 = d.y1 * h, x2 = d.x2 * w, y2 = d.y2 * h;

      // Draw arrow line
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Draw arrowhead
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = Math.max(strokeWidth * 4, 12);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - headLen * Math.cos(angle - Math.PI / 6),
        y2 - headLen * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(
        x2 - headLen * Math.cos(angle + Math.PI / 6),
        y2 - headLen * Math.sin(angle + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'rectangle': {
      if (d.x1 === null || d.y1 === null || d.x2 === null || d.y2 === null) return;
      const x = Math.min(d.x1, d.x2) * w;
      const y = Math.min(d.y1, d.y2) * h;
      const rw = Math.abs(d.x2 - d.x1) * w;
      const rh = Math.abs(d.y2 - d.y1) * h;
      ctx.strokeRect(x, y, rw, rh);
      break;
    }

    case 'circle': {
      if (d.x1 === null || d.y1 === null || d.x2 === null || d.y2 === null) return;
      const cx = ((d.x1 + d.x2) / 2) * w;
      const cy = ((d.y1 + d.y2) / 2) * h;
      const rx = (Math.abs(d.x2 - d.x1) / 2) * w;
      const ry = (Math.abs(d.y2 - d.y1) / 2) * h;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case 'text': {
      const tx = (d.x ?? d.x1 ?? 0) * w;
      const ty = (d.y ?? d.y1 ?? 0) * h;
      // fontSize is stored as percentage of container width (3=S, 5=M, 8=L)
      const fontSize = w * ((d.fontSize ?? 5) / 100);
      const padding = fontSize * 0.4;
      const textContent = d.content ?? '';

      // Measure text width for background card
      ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
      const metrics = ctx.measureText(textContent);
      const textWidth = metrics.width;

      // Background card dimensions
      const cardX = tx;
      const cardY = ty - fontSize - padding;
      const cardW = textWidth + padding * 2;
      const cardH = fontSize * 1.2 + padding;
      const radius = padding;

      // Color logic matching ShapeRenderer
      const isColored = d.color === 'red' || d.color === 'teal';
      const isLight = d.color === 'white';

      let bgColor: string;
      let textColor: string;
      if (isColored) {
        bgColor = color;
        textColor = '#ffffff';
      } else if (isLight) {
        bgColor = 'rgba(255, 255, 255, 0.80)';
        textColor = '#000000';
      } else {
        bgColor = 'rgba(30, 30, 30, 0.80)';
        textColor = '#ffffff';
      }

      // Draw rounded rect background
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, radius);
      ctx.fill();

      // Optional border for light/white cards
      if (isLight) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw text
      ctx.fillStyle = textColor;
      ctx.textBaseline = 'top';
      ctx.fillText(textContent, cardX + padding, cardY + padding * 0.5);
      ctx.textBaseline = 'alphabetic'; // reset
      break;
    }

    case 'freehand': {
      if (!d.points) return;
      let points: Array<{ x: number; y: number }>;
      try {
        points = JSON.parse(d.points) as Array<{ x: number; y: number }>;
      } catch (err) {
        console.error('[renderDrawingToCanvas] Failed to parse freehand points:', err);
        return;
      }
      if (points.length === 0) return;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(points[0].x * w, points[0].y * h);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x * w, points[i].y * h);
      }
      ctx.stroke();
      break;
    }
  }
}
