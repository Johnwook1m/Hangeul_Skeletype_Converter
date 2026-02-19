/**
 * Offset Path computation for centerline paths.
 * Converts SVG paths to polylines, offsets by normal direction, returns SVG path strings.
 */

import { parsePathToSubpaths } from './glyphDecorators';

/**
 * Convert parsed segments (from parsePathToSubpaths) into a dense polyline.
 * @param {object[]} segments - Array of { length, pointAt(t) }
 * @param {number} density - Points per unit length
 * @returns {{ x: number, y: number }[]}
 */
function subpathToPolyline(segments, density = 0.5) {
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
 * Compute the offset of a polyline by moving each vertex along its averaged normal.
 * @param {{ x: number, y: number }[]} points - Input polyline
 * @param {number} offset - Offset distance (positive = left side, negative = right side)
 * @param {string} join - Join type: 'round' | 'miter' | 'bevel'
 * @returns {{ x: number, y: number }[]}
 */
function offsetPolyline(points, offset, join = 'round') {
  if (points.length < 2) return points;

  const n = points.length;
  const normals = [];

  // Compute per-segment normals
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-6) {
      normals.push({ x: 0, y: 0 });
    } else {
      // Left normal: (-dy, dx) normalized
      normals.push({ x: -dy / len, y: dx / len });
    }
  }

  const result = [];

  // First point: use first segment's normal
  result.push({
    x: points[0].x + normals[0].x * offset,
    y: points[0].y + normals[0].y * offset,
  });

  // Interior points: average adjacent normals for smooth offset
  for (let i = 1; i < n - 1; i++) {
    const n1 = normals[i - 1];
    const n2 = normals[i];

    // Average normal
    let nx = n1.x + n2.x;
    let ny = n1.y + n2.y;
    const len = Math.sqrt(nx * nx + ny * ny);

    if (len < 1e-6) {
      // Parallel segments, use either normal
      result.push({
        x: points[i].x + n1.x * offset,
        y: points[i].y + n1.y * offset,
      });
    } else {
      nx /= len;
      ny /= len;

      // Compute miter length: offset / cos(half-angle)
      const dot = n1.x * nx + n1.y * ny;
      const miterLen = dot > 0.1 ? offset / dot : offset;

      if (join === 'miter' && Math.abs(miterLen) < Math.abs(offset) * 4) {
        // Miter join: extend to intersection
        result.push({
          x: points[i].x + nx * miterLen,
          y: points[i].y + ny * miterLen,
        });
      } else if (join === 'bevel') {
        // Bevel: add two points (one per segment normal)
        result.push({
          x: points[i].x + n1.x * offset,
          y: points[i].y + n1.y * offset,
        });
        result.push({
          x: points[i].x + n2.x * offset,
          y: points[i].y + n2.y * offset,
        });
      } else {
        // Round (default): use averaged normal with miter distance
        const clampedMiter = Math.abs(miterLen) > Math.abs(offset) * 2
          ? offset
          : miterLen;
        result.push({
          x: points[i].x + nx * clampedMiter,
          y: points[i].y + ny * clampedMiter,
        });
      }
    }
  }

  // Last point: use last segment's normal
  const lastNormal = normals[normals.length - 1];
  result.push({
    x: points[n - 1].x + lastNormal.x * offset,
    y: points[n - 1].y + lastNormal.y * offset,
  });

  return result;
}

/**
 * Convert a polyline to an SVG path 'd' string.
 * @param {{ x: number, y: number }[]} points
 * @returns {string}
 */
function polylineToSvgPath(points) {
  if (points.length === 0) return '';
  const parts = [`M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`];
  for (let i = 1; i < points.length; i++) {
    parts.push(`L ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`);
  }
  return parts.join(' ');
}

const RASTER_PADDING = 20;

/**
 * Compute offset paths for all glyphs.
 * Returns an array of per-glyph offset path data, grouped by glyph index.
 *
 * @param {object[]} glyphList - Array of glyph render data (from glyphsToRender)
 * @param {object} offsetPathParams - Offset path parameters from store
 * @param {number} fontToDisplay - Font-to-display scale factor
 * @returns {{ glyphIndex: number, paths: string[] }[]}
 */
export function computeOffsetPaths(glyphList, offsetPathParams, fontToDisplay) {
  if (!offsetPathParams.enabled || glyphList.length === 0) return [];

  const { offset, count, join, bothSides } = offsetPathParams;
  const result = [];

  for (let gi = 0; gi < glyphList.length; gi++) {
    const glyph = glyphList[gi];
    if (!glyph.centerline || !glyph.centerline.paths) continue;

    const glyphPaths = [];

    for (const pathD of glyph.centerline.paths) {
      const subpaths = parsePathToSubpaths(pathD);

      for (const segments of subpaths) {
        if (segments.length === 0) continue;

        // Convert to polyline (in pixel/raster space)
        const polyline = subpathToPolyline(segments);
        if (polyline.length < 2) continue;

        // Generate offset paths for each repetition
        for (let c = 1; c <= count; c++) {
          const dist = offset * c;

          // Positive side
          const offsetPoints = offsetPolyline(polyline, dist, join);
          glyphPaths.push(polylineToSvgPath(offsetPoints));

          // Negative side (if bothSides)
          if (bothSides) {
            const negPoints = offsetPolyline(polyline, -dist, join);
            glyphPaths.push(polylineToSvgPath(negPoints));
          }
        }
      }
    }

    if (glyphPaths.length > 0) {
      result.push({ glyphIndex: gi, paths: glyphPaths });
    }
  }

  return result;
}
