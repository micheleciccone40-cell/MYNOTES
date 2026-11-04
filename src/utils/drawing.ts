import { getStroke } from 'perfect-freehand';
import type { Stroke } from '../types';

export interface StrokeOptions {
  size: number;
  thinning?: number;
  smoothing?: number;
  streamline?: number;
  simulatePressure?: boolean;
}

/**
 * Straightens highlighter points naturally:
 * "più o meno dritta, non per forza drittissima"
 * - Pulls intermediate points towards the linear direction by ~78%.
 * - If mostly horizontal (text swipe), flattens vertical wobble to align with text.
 * - Retains ~22% organic hand curvature and exact natural endpoints.
 */
export function straightenHighlighterPoints(
  points: [number, number, number][]
): [number, number, number][] {
  if (!points || points.length < 3) return points;

  const start = points[0];
  const end = points[points.length - 1];
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSq = dx * dx + dy * dy;

  // Very short stroke (dot / tap) - don't alter
  if (lengthSq < 100) return points;

  const length = Math.sqrt(lengthSq);
  // Predominantly horizontal swipe (common when highlighting text lines)
  const isHorizontal = Math.abs(dy) / length < 0.35;
  const pullFactor = isHorizontal ? 0.82 : 0.74;

  // 1. Projection and blend towards straight trajectory
  const blended: [number, number, number][] = points.map((pt, i) => {
    if (i === 0 || i === points.length - 1) return pt;

    const [x, y, pressure] = pt;
    const t = Math.max(0, Math.min(1, ((x - start[0]) * dx + (y - start[1]) * dy) / lengthSq));
    const projX = start[0] + t * dx;
    const projY = start[1] + t * dy;

    const smoothedX = x * (1 - pullFactor) + projX * pullFactor;
    const smoothedY = y * (1 - pullFactor) + projY * pullFactor;

    return [smoothedX, smoothedY, pressure];
  });

  // 2. Moving average smoothing (window size 3) to eliminate hand tremors
  const result: [number, number, number][] = [];
  for (let i = 0; i < blended.length; i++) {
    if (i === 0 || i === blended.length - 1) {
      result.push(blended[i]);
    } else {
      const prev = blended[i - 1];
      const curr = blended[i];
      const next = blended[i + 1];
      result.push([
        (prev[0] + curr[0] * 2 + next[0]) / 4,
        (prev[1] + curr[1] * 2 + next[1]) / 4,
        curr[2]
      ]);
    }
  }

  return result;
}

export function computeStrokeOutline(
  points: [number, number, number][],
  tool: 'pen' | 'highlighter',
  size: number
): number[][] {
  const isHighlighter = tool === 'highlighter';
  const pts = isHighlighter ? straightenHighlighterPoints(points) : points;
  return getStroke(pts, {
    size: isHighlighter ? size * 1.5 : size,
    thinning: isHighlighter ? 0.05 : 0.6,
    smoothing: isHighlighter ? 0.8 : 0.65,
    streamline: isHighlighter ? 0.7 : 0.55,
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
    // Giallo pastello opaco / morbido che non copre il testo
    ctx.globalAlpha = stroke.opacity || 0.48;
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
