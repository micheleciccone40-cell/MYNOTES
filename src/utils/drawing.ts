import { getStroke } from 'perfect-freehand';
import type { Stroke } from '../types';

export interface StrokeOptions {
  size: number;
  thinning?: number;
  smoothing?: number;
  streamline?: number;
  simulatePressure?: boolean;
}

export function computeStrokeOutline(
  points: [number, number, number][],
  tool: 'pen' | 'highlighter',
  size: number
): number[][] {
  const isHighlighter = tool === 'highlighter';
  return getStroke(points, {
    size: isHighlighter ? size * 2.2 : size,
    thinning: isHighlighter ? 0.1 : 0.6,
    smoothing: 0.65,
    streamline: 0.55,
    easing: (t) => t,
    simulatePressure: false,
    last: true,
  });
}

export function drawStrokeToContext(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (!stroke.points || stroke.points.length === 0) return;

  ctx.save();

  if (stroke.tool === 'line') {
    const p1 = stroke.points[0];
    const p2 = stroke.points[stroke.points.length - 1];
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (stroke.tool === 'rect') {
    const p1 = stroke.points[0];
    const p2 = stroke.points[stroke.points.length - 1];
    const x = Math.min(p1[0], p2[0]);
    const y = Math.min(p1[1], p2[1]);
    const w = Math.abs(p1[0] - p2[0]);
    const h = Math.abs(p1[1] - p2[1]);
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineJoin = 'round';
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
    return;
  }

  if (stroke.tool === 'circle') {
    const p1 = stroke.points[0];
    const p2 = stroke.points[stroke.points.length - 1];
    const cx = (p1[0] + p2[0]) / 2;
    const cy = (p1[1] + p2[1]) / 2;
    const rx = Math.abs(p1[0] - p2[0]) / 2;
    const ry = Math.abs(p1[1] - p2[1]) / 2;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Freehand pen or highlighter
  const isHighlighter = stroke.tool === 'highlighter';
  if (isHighlighter) {
    ctx.globalAlpha = stroke.opacity || 0.38;
    ctx.globalCompositeOperation = 'multiply';
  } else {
    ctx.globalAlpha = stroke.opacity || 1.0;
  }

  ctx.fillStyle = stroke.color;

  const outline = computeStrokeOutline(stroke.points, stroke.tool, stroke.size);
  if (outline.length > 0) {
    ctx.beginPath();
    ctx.moveTo(outline[0][0], outline[0][1]);
    for (let i = 1; i < outline.length; i++) {
      const [x0, y0] = outline[i];
      const [x1, y1] = outline[(i + 1) % outline.length];
      ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Checks if a point (x,y) hits/touches a stroke (for stroke eraser)
 */
export function isPointNearStroke(
  px: number,
  py: number,
  stroke: Stroke,
  threshold: number = 18
): boolean {
  if (!stroke.points || stroke.points.length === 0) return false;
  
  // Quick bounding box check
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pt of stroke.points) {
    if (pt[0] < minX) minX = pt[0];
    if (pt[0] > maxX) maxX = pt[0];
    if (pt[1] < minY) minY = pt[1];
    if (pt[1] > maxY) maxY = pt[1];
  }
  
  const paddedThreshold = threshold + stroke.size;
  if (
    px < minX - paddedThreshold ||
    px > maxX + paddedThreshold ||
    py < minY - paddedThreshold ||
    py > maxY + paddedThreshold
  ) {
    return false;
  }

  // Point to segment distance check
  const thresholdSq = paddedThreshold * paddedThreshold;
  for (let i = 0; i < stroke.points.length; i++) {
    const pt = stroke.points[i];
    const dx = pt[0] - px;
    const dy = pt[1] - py;
    if (dx * dx + dy * dy <= thresholdSq) {
      return true;
    }
  }

  return false;
}
