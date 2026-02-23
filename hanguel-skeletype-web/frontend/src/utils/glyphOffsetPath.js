/**
 * Offset Path computation for centerline paths.
 * Creates closed outline paths (both sides + rounded end caps) per stroke,
 * like Illustrator's Offset Path on an outlined open stroke.
 */

import { parsePathToSubpaths } from './glyphDecorators';

/**
 * Convert parsed segments to a dense polyline.
 */
function subpathToPolyline(segments, density = 1.0) {
  if (segments.length === 0) return [];

  const points = [];
  for (const seg of segments) {
    const count = Math.max(2, Math.ceil(seg.length * density));
    for (let i = 0; i < count; i++) {
      points.push(seg.pointAt(i / (count - 1)));
    }
  }

  // Deduplicate consecutive near-identical points
  const result = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - result[result.length - 1].x;
    const dy = points[i].y - result[result.length - 1].y;
    if (dx * dx + dy * dy > 0.01) {
      result.push(points[i]);
    }
  }

  return result;
}

/**
 * Offset a polyline by moving each vertex along its averaged normal.
 */
function offsetPolyline(points, offset, join = 'round') {
  if (points.length < 2) return points.map((p) => ({ ...p }));

  const n = points.length;

  // Compute per-segment normals (left normal: perpendicular CCW)
  const normals = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    normals.push(len < 1e-6 ? { x: 0, y: 0 } : { x: -dy / len, y: dx / len });
  }

  const result = [];

  // First point: use first segment's normal
  result.push({
    x: points[0].x + normals[0].x * offset,
    y: points[0].y + normals[0].y * offset,
  });

  // Interior points: average adjacent normals
  for (let i = 1; i < n - 1; i++) {
    const n1 = normals[i - 1];
    const n2 = normals[i];

    let nx = n1.x + n2.x;
    let ny = n1.y + n2.y;
    const len = Math.sqrt(nx * nx + ny * ny);

    if (len < 1e-6) {
      // Parallel or reversed segments — use segment normal directly
      result.push({ x: points[i].x + n1.x * offset, y: points[i].y + n1.y * offset });
    } else {
      nx /= len;
      ny /= len;
      const dot = n1.x * nx + n1.y * ny;
      const miterLen = dot > 0.1 ? offset / dot : offset;

      if (join === 'miter' && Math.abs(miterLen) < Math.abs(offset) * 4) {
        result.push({ x: points[i].x + nx * miterLen, y: points[i].y + ny * miterLen });
      } else if (join === 'bevel') {
        result.push({ x: points[i].x + n1.x * offset, y: points[i].y + n1.y * offset });
        result.push({ x: points[i].x + n2.x * offset, y: points[i].y + n2.y * offset });
      } else {
        // Round: clamp miter to avoid huge spikes at sharp corners
        const clamped = Math.abs(miterLen) > Math.abs(offset) * 2 ? offset : miterLen;
        result.push({ x: points[i].x + nx * clamped, y: points[i].y + ny * clamped });
      }
    }
  }

  // Last point: use last segment's normal
  const last = normals[normals.length - 1];
  result.push({
    x: points[n - 1].x + last.x * offset,
    y: points[n - 1].y + last.y * offset,
  });

  return result;
}

/**
 * Generate arc points sweeping from `from` to `to` around `center`,
 * in the direction closest to `outwardAngle` (radians).
 */
function generateArc(from, to, center, outwardAngle, numPoints = 10) {
  const startAngle = Math.atan2(from.y - center.y, from.x - center.x);
  const endAngle = Math.atan2(to.y - center.y, to.x - center.x);
  const radius = Math.sqrt((from.x - center.x) ** 2 + (from.y - center.y) ** 2);

  if (radius < 1e-6) return [];

  // Two possible sweeps: CCW (positive) and CW (negative)
  let sweepCCW = endAngle - startAngle;
  while (sweepCCW < 0) sweepCCW += 2 * Math.PI;
  while (sweepCCW > 2 * Math.PI) sweepCCW -= 2 * Math.PI;
  const sweepCW = sweepCCW - 2 * Math.PI; // CW = negative

  // Pick the sweep whose midpoint is closest to the outward direction
  const midCCW = startAngle + sweepCCW / 2;
  const midCW = startAngle + sweepCW / 2;

  function angDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return Math.abs(d);
  }

  const sweep = angDiff(midCCW, outwardAngle) < angDiff(midCW, outwardAngle)
    ? sweepCCW
    : sweepCW;

  const pts = [];
  for (let i = 1; i <= numPoints; i++) {
    const angle = startAngle + sweep * (i / numPoints);
    pts.push({ x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) });
  }
  return pts;
}

/**
 * Create a single closed outline path (pill shape) around a polyline.
 * Goes along positive side → end cap → negative side reversed → start cap → close.
 */
function createOutlinePath(polyline, offset, join) {
  if (polyline.length < 2) return '';

  const n = polyline.length;
  const pos = offsetPolyline(polyline, offset, join);
  const neg = offsetPolyline(polyline, -offset, join);

  // Outward direction at stroke end: away from interior (= direction of last segment)
  const endDx = polyline[n - 1].x - polyline[n - 2].x;
  const endDy = polyline[n - 1].y - polyline[n - 2].y;
  const endLen = Math.sqrt(endDx * endDx + endDy * endDy);
  const endOutwardAngle = endLen > 1e-6 ? Math.atan2(endDy / endLen, endDx / endLen) : 0;

  // Outward direction at stroke start: opposite of first segment direction
  const startDx = polyline[0].x - polyline[1].x;
  const startDy = polyline[0].y - polyline[1].y;
  const startLen = Math.sqrt(startDx * startDx + startDy * startDy);
  const startOutwardAngle = startLen > 1e-6 ? Math.atan2(startDy / startLen, startDx / startLen) : Math.PI;

  // End cap: pos[last] → neg[last], sweeping around stroke end
  const endArc = generateArc(pos[pos.length - 1], neg[neg.length - 1], polyline[n - 1], endOutwardAngle);

  // Start cap: neg[0] → pos[0], sweeping around stroke start
  const startArc = generateArc(neg[0], pos[0], polyline[0], startOutwardAngle);

  const fmt = (v) => v.toFixed(2);
  const parts = [`M ${fmt(pos[0].x)} ${fmt(pos[0].y)}`];

  // Positive side forward
  for (let i = 1; i < pos.length; i++) {
    parts.push(`L ${fmt(pos[i].x)} ${fmt(pos[i].y)}`);
  }

  // End cap arc
  for (const p of endArc) {
    parts.push(`L ${fmt(p.x)} ${fmt(p.y)}`);
  }

  // Negative side reversed (skip last point already reached by end arc)
  for (let i = neg.length - 2; i >= 0; i--) {
    parts.push(`L ${fmt(neg[i].x)} ${fmt(neg[i].y)}`);
  }

  // Start cap arc (ends at pos[0] = first M point)
  for (const p of startArc) {
    parts.push(`L ${fmt(p.x)} ${fmt(p.y)}`);
  }

  parts.push('Z');
  return parts.join(' ');
}

/**
 * Compute offset ring paths for all glyphs.
 * Returns closed pill-shaped paths (both sides + end caps) rendered as fill="none" strokes.
 *
 * @param {object[]} glyphList
 * @param {object} offsetPathParams - { offset, count, corner, weight, color, enabled }
 * @returns {{ glyphIndex: number, paths: string[] }[]}
 */
export function computeOffsetPaths(glyphList, offsetPathParams) {
  if (!offsetPathParams.enabled || glyphList.length === 0) return [];

  const { offset, count, corner } = offsetPathParams;
  const join = corner === 'sharp' ? 'miter' : 'round';
  const result = [];

  for (let gi = 0; gi < glyphList.length; gi++) {
    const glyph = glyphList[gi];
    if (!glyph.centerline || !glyph.centerline.paths) continue;

    const glyphPaths = [];

    for (const pathD of glyph.centerline.paths) {
      const subpaths = parsePathToSubpaths(pathD);

      for (const segments of subpaths) {
        if (segments.length === 0) continue;

        const polyline = subpathToPolyline(segments);
        if (polyline.length < 2) continue;

        for (let c = 1; c <= count; c++) {
          const d = createOutlinePath(polyline, offset * c, join);
          if (d) glyphPaths.push(d);
        }
      }
    }

    if (glyphPaths.length > 0) {
      result.push({ glyphIndex: gi, paths: glyphPaths });
    }
  }

  return result;
}
