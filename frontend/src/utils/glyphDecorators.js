/**
 * Sample points along SVG path segments and place decorator shapes.
 */

/**
 * Evaluate a cubic bezier at parameter t.
 */
function cubicBezier(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

/**
 * Evaluate a quadratic bezier at parameter t.
 */
function quadBezier(p0, p1, p2, t) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

/**
 * Approximate arc length of a cubic bezier by subdividing into small segments.
 */
function cubicLength(p0, p1, p2, p3, steps = 20) {
  let len = 0;
  let prev = p0;
  for (let i = 1; i <= steps; i++) {
    const pt = cubicBezier(p0, p1, p2, p3, i / steps);
    const dx = pt.x - prev.x, dy = pt.y - prev.y;
    len += Math.sqrt(dx * dx + dy * dy);
    prev = pt;
  }
  return len;
}

function quadLength(p0, p1, p2, steps = 20) {
  let len = 0;
  let prev = p0;
  for (let i = 1; i <= steps; i++) {
    const pt = quadBezier(p0, p1, p2, i / steps);
    const dx = pt.x - prev.x, dy = pt.y - prev.y;
    len += Math.sqrt(dx * dx + dy * dy);
    prev = pt;
  }
  return len;
}

/**
 * Parse a single SVG path into subpaths, each containing segments with
 * length and point-at-t functions.
 * Returns array of subpath segment arrays: [[{length, pointAt}], ...]
 */
export function parsePathToSubpaths(d) {
  const tokens = d.match(/[MmLlCcQqSsTtAaHhVvZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
  if (!tokens) return [];

  const subpaths = [];
  let currentSegments = [];
  let curX = 0, curY = 0;
  let startX = 0, startY = 0;
  let hasMove = false;
  let i = 0;

  while (i < tokens.length) {
    const cmd = tokens[i];
    if (!/[A-Za-z]/.test(cmd)) { i++; continue; }
    i++;

    const nums = [];
    while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
      nums.push(parseFloat(tokens[i]));
      i++;
    }

    switch (cmd) {
      case 'M':
        // Start a new subpath — flush previous if it has segments
        if (currentSegments.length > 0) {
          subpaths.push(currentSegments);
          currentSegments = [];
        }
        for (let j = 0; j < nums.length - 1; j += 2) {
          curX = nums[j]; curY = nums[j + 1];
          if (j === 0) { startX = curX; startY = curY; }
        }
        hasMove = true;
        break;
      case 'm':
        if (currentSegments.length > 0) {
          subpaths.push(currentSegments);
          currentSegments = [];
        }
        for (let j = 0; j < nums.length - 1; j += 2) {
          curX += nums[j]; curY += nums[j + 1];
          if (j === 0) { startX = curX; startY = curY; }
        }
        hasMove = true;
        break;
      case 'L':
        for (let j = 0; j < nums.length - 1; j += 2) {
          const x0 = curX, y0 = curY;
          curX = nums[j]; curY = nums[j + 1];
          const dx = curX - x0, dy = curY - y0;
          currentSegments.push({
            length: Math.sqrt(dx * dx + dy * dy),
            pointAt: (t) => ({ x: x0 + dx * t, y: y0 + dy * t }),
          });
        }
        break;
      case 'l':
        for (let j = 0; j < nums.length - 1; j += 2) {
          const x0 = curX, y0 = curY;
          curX += nums[j]; curY += nums[j + 1];
          const dx = curX - x0, dy = curY - y0;
          currentSegments.push({
            length: Math.sqrt(dx * dx + dy * dy),
            pointAt: (t) => ({ x: x0 + dx * t, y: y0 + dy * t }),
          });
        }
        break;
      case 'H':
        if (nums.length > 0) {
          const x0 = curX, y0 = curY;
          curX = nums[nums.length - 1];
          const dx = curX - x0;
          currentSegments.push({
            length: Math.abs(dx),
            pointAt: (t) => ({ x: x0 + dx * t, y: y0 }),
          });
        }
        break;
      case 'h':
        for (let j = 0; j < nums.length; j++) {
          const x0 = curX, y0 = curY;
          curX += nums[j];
          const dx = nums[j];
          currentSegments.push({
            length: Math.abs(dx),
            pointAt: (t) => ({ x: x0 + dx * t, y: y0 }),
          });
        }
        break;
      case 'V':
        if (nums.length > 0) {
          const x0 = curX, y0 = curY;
          curY = nums[nums.length - 1];
          const dy = curY - y0;
          currentSegments.push({
            length: Math.abs(dy),
            pointAt: (t) => ({ x: x0, y: y0 + dy * t }),
          });
        }
        break;
      case 'v':
        for (let j = 0; j < nums.length; j++) {
          const x0 = curX, y0 = curY;
          curY += nums[j];
          const dy = nums[j];
          currentSegments.push({
            length: Math.abs(dy),
            pointAt: (t) => ({ x: x0, y: y0 + dy * t }),
          });
        }
        break;
      case 'C':
        for (let j = 0; j < nums.length - 5; j += 6) {
          const p0 = { x: curX, y: curY };
          const p1 = { x: nums[j], y: nums[j + 1] };
          const p2 = { x: nums[j + 2], y: nums[j + 3] };
          const p3 = { x: nums[j + 4], y: nums[j + 5] };
          curX = p3.x; curY = p3.y;
          currentSegments.push({
            length: cubicLength(p0, p1, p2, p3),
            pointAt: (t) => cubicBezier(p0, p1, p2, p3, t),
          });
        }
        break;
      case 'c':
        for (let j = 0; j < nums.length - 5; j += 6) {
          const p0 = { x: curX, y: curY };
          const p1 = { x: curX + nums[j], y: curY + nums[j + 1] };
          const p2 = { x: curX + nums[j + 2], y: curY + nums[j + 3] };
          const p3 = { x: curX + nums[j + 4], y: curY + nums[j + 5] };
          curX = p3.x; curY = p3.y;
          currentSegments.push({
            length: cubicLength(p0, p1, p2, p3),
            pointAt: (t) => cubicBezier(p0, p1, p2, p3, t),
          });
        }
        break;
      case 'Q':
        for (let j = 0; j < nums.length - 3; j += 4) {
          const p0 = { x: curX, y: curY };
          const p1 = { x: nums[j], y: nums[j + 1] };
          const p2 = { x: nums[j + 2], y: nums[j + 3] };
          curX = p2.x; curY = p2.y;
          currentSegments.push({
            length: quadLength(p0, p1, p2),
            pointAt: (t) => quadBezier(p0, p1, p2, t),
          });
        }
        break;
      case 'q':
        for (let j = 0; j < nums.length - 3; j += 4) {
          const p0 = { x: curX, y: curY };
          const p1 = { x: curX + nums[j], y: curY + nums[j + 1] };
          const p2 = { x: curX + nums[j + 2], y: curY + nums[j + 3] };
          curX = p2.x; curY = p2.y;
          currentSegments.push({
            length: quadLength(p0, p1, p2),
            pointAt: (t) => quadBezier(p0, p1, p2, t),
          });
        }
        break;
      case 'Z':
      case 'z': {
        const dx = startX - curX, dy = startY - curY;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0.1) {
          const x0 = curX, y0 = curY;
          currentSegments.push({
            length: len,
            pointAt: (t) => ({ x: x0 + dx * t, y: y0 + dy * t }),
          });
        }
        curX = startX; curY = startY;
        break;
      }
    }
  }

  // Flush last subpath
  if (currentSegments.length > 0) {
    subpaths.push(currentSegments);
  }

  return subpaths;
}

/**
 * Parse a single SVG path into a flat list of segments (all subpaths merged).
 * Returns array of { length, pointAt(t) }
 */
function parsePathToSegments(d) {
  return parsePathToSubpaths(d).flat();
}

/**
 * Sample N points along a parsed segment list at even arc-length intervals.
 * @param {object[]} segments - Array of { length, pointAt(t) }
 * @param {number} count - Number of points to sample
 * @param {string} spacing - 'even' | 'endpoints' | 'random'
 * @returns {{ x: number, y: number }[]}
 */
function samplePoints(segments, count, spacing) {
  if (segments.length === 0) return [];

  const totalLength = segments.reduce((sum, s) => sum + s.length, 0);
  if (totalLength < 0.1) return [];

  // Helper: tangent angle at a given segment + local t
  function angleAt(seg, t) {
    const dt = 0.001;
    const t0 = Math.max(0, t - dt);
    const t1 = Math.min(1, t + dt);
    const a = seg.pointAt(t0);
    const b = seg.pointAt(t1);
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  if (spacing === 'endpoints') {
    // Just start and end points
    const firstSeg = segments[0];
    const lastSeg = segments[segments.length - 1];
    const first = firstSeg.pointAt(0);
    const last = lastSeg.pointAt(1);
    return [
      { x: first.x, y: first.y, angle: angleAt(firstSeg, 0) },
      { x: last.x, y: last.y, angle: angleAt(lastSeg, 1) },
    ];
  }

  // Build cumulative length table for parameterization
  const cumLengths = [];
  let cum = 0;
  for (const seg of segments) {
    cumLengths.push(cum);
    cum += seg.length;
  }

  function pointAtLength(targetLen) {
    for (let i = 0; i < segments.length; i++) {
      if (targetLen <= cumLengths[i] + segments[i].length || i === segments.length - 1) {
        const localT = segments[i].length > 0
          ? (targetLen - cumLengths[i]) / segments[i].length
          : 0;
        const tt = Math.min(1, Math.max(0, localT));
        const p = segments[i].pointAt(tt);
        return { x: p.x, y: p.y, angle: angleAt(segments[i], tt) };
      }
    }
    const p0 = segments[0].pointAt(0);
    return { x: p0.x, y: p0.y, angle: angleAt(segments[0], 0) };
  }

  const points = [];

  if (spacing === 'random') {
    // Seeded pseudo-random for consistency (based on total length)
    let seed = Math.round(totalLength * 100);
    function rand() {
      seed = (seed * 16807 + 0) % 2147483647;
      return seed / 2147483647;
    }
    for (let i = 0; i < count; i++) {
      points.push(pointAtLength(rand() * totalLength));
    }
  } else {
    // Even spacing
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      points.push(pointAtLength(t * totalLength));
    }
  }

  return points;
}

const RASTER_PADDING = 20;

/**
 * Compute decorator points for all glyphs.
 * Returns points grouped by glyph index in glyph-local coordinate space
 * (relative to each glyph's xOffset/yOffset), so they can be rendered
 * inside each glyph's scaleTransform group and follow XY/Slant transforms.
 *
 * @param {object[]} glyphList - Array of glyph render data
 * @param {object} decoratorParams - Decorator parameters from store
 * @param {number} fontToDisplay - Font-to-display scale factor
 * @returns {{ glyphIndex: number, points: { x: number, y: number }[] }[]}
 */
export function computeDecorators(glyphList, decoratorParams, fontToDisplay) {
  if (!decoratorParams.enabled || glyphList.length === 0) return [];

  const { count, spacing } = decoratorParams;

  // Helper: convert raster point to glyph-local display coords (no xOffset/yOffset)
  function makeToLocal(glyph) {
    const { K } = glyph;
    const bounds = glyph.centerline.bounds || {};
    const xMin = bounds.xMin || 0;
    const clTranslateX = xMin * fontToDisplay - RASTER_PADDING * K;
    const clTranslateY = -RASTER_PADDING * K;
    return (pt) => ({
      x: pt.x * K + clTranslateX,
      y: pt.y * K + clTranslateY,
      angle: pt.angle ?? 0,
    });
  }

  if (spacing === 'endpoints') {
    // Endpoints mode: place decorators at every subpath start/end
    const result = [];
    glyphList.forEach((glyph, glyphIndex) => {
      if (!glyph.centerline || !glyph.centerline.paths) return;
      const toLocal = makeToLocal(glyph);
      const points = [];
      for (const pathD of glyph.centerline.paths) {
        const subpaths = parsePathToSubpaths(pathD);
        for (const segments of subpaths) {
          if (segments.length === 0) continue;
          const firstSeg = segments[0];
          const lastSeg = segments[segments.length - 1];
          const dt = 0.001;
          const a0 = firstSeg.pointAt(0);
          const a1 = firstSeg.pointAt(dt);
          const b0 = lastSeg.pointAt(1 - dt);
          const b1 = lastSeg.pointAt(1);
          points.push(toLocal({ ...a0, angle: Math.atan2(a1.y - a0.y, a1.x - a0.x) }));
          points.push(toLocal({ ...b1, angle: Math.atan2(b1.y - b0.y, b1.x - b0.x) }));
        }
      }
      if (points.length > 0) result.push({ glyphIndex, points });
    });
    return result;
  }

  if (spacing === 'tips') {
    // Tips: only "free" stroke endpoints (not connected to another stroke).
    // For each candidate endpoint, scan all other subpaths' sampled points
    // and skip if any are within a small distance (junction).
    const result = [];
    glyphList.forEach((glyph, glyphIndex) => {
      if (!glyph.centerline || !glyph.centerline.paths) return;
      const toLocal = makeToLocal(glyph);

      // Collect all subpaths in this glyph (raster space)
      const allSubpaths = [];
      for (const pathD of glyph.centerline.paths) {
        for (const segs of parsePathToSubpaths(pathD)) {
          if (segs.length === 0) continue;
          allSubpaths.push(segs);
        }
      }
      if (allSubpaths.length === 0) return;

      // Glyph size estimate from bounds for threshold
      const bounds = glyph.centerline.bounds || {};
      const w = (bounds.xMax ?? 1000) - (bounds.xMin ?? 0);
      const h = (bounds.yMax ?? 1000) - (bounds.yMin ?? 0);
      const rasterScale = glyph.rasterScale || 1;
      // bounds are in font units; convert to raster pixels via raster_scale.
      // Threshold: 6% of max glyph dimension in raster space.
      const threshold = Math.max(w, h) * rasterScale * 0.06;
      const thr2 = threshold * threshold;

      // Pre-sample all subpaths for junction lookup
      const sampled = allSubpaths.map((segs) => {
        const pts = [];
        const N = 24;
        const totalLen = segs.reduce((s, x) => s + x.length, 0);
        if (totalLen < 0.1) return pts;
        // walk segments by even t per segment (cheap, good enough)
        for (const seg of segs) {
          for (let k = 1; k < N; k++) {
            pts.push(seg.pointAt(k / N));
          }
        }
        return pts;
      });

      const points = [];
      for (let si = 0; si < allSubpaths.length; si++) {
        const segs = allSubpaths[si];
        const firstSeg = segs[0];
        const lastSeg = segs[segs.length - 1];
        const dt = 0.001;
        const a0 = firstSeg.pointAt(0);
        const a1 = firstSeg.pointAt(dt);
        const b0 = lastSeg.pointAt(1 - dt);
        const b1 = lastSeg.pointAt(1);

        // Start endpoint: forward tangent points INTO the stroke, so flip by 180°
        // to make the decorator face outward regardless of trace direction.
        for (const ep of [
          { pt: a0, angle: Math.atan2(a1.y - a0.y, a1.x - a0.x) + Math.PI },
          { pt: b1, angle: Math.atan2(b1.y - b0.y, b1.x - b0.x) },
        ]) {
          let isJunction = false;
          for (let sj = 0; sj < sampled.length; sj++) {
            if (sj === si) continue;
            for (const q of sampled[sj]) {
              const dx = q.x - ep.pt.x;
              const dy = q.y - ep.pt.y;
              if (dx * dx + dy * dy < thr2) { isJunction = true; break; }
            }
            if (isJunction) break;
          }
          if (!isJunction) {
            points.push(toLocal({ x: ep.pt.x, y: ep.pt.y, angle: ep.angle }));
          }
        }
      }
      if (points.length > 0) result.push({ glyphIndex, points });
    });
    return result;
  }

  // Even / Random mode: use uniform spacing distance across ALL paths
  // 1) Collect all parsed path data with their glyph index and local transforms
  const pathEntries = [];
  let totalLength = 0;

  glyphList.forEach((glyph, glyphIndex) => {
    if (!glyph.centerline || !glyph.centerline.paths) return;
    const toLocal = makeToLocal(glyph);

    for (const pathD of glyph.centerline.paths) {
      const segments = parsePathToSegments(pathD);
      if (segments.length === 0) continue;
      const pathLength = segments.reduce((sum, s) => sum + s.length, 0);
      if (pathLength < 0.1) continue;
      totalLength += pathLength;
      pathEntries.push({ segments, pathLength, toLocal, glyphIndex });
    }
  });

  if (totalLength < 0.1 || pathEntries.length === 0) return [];

  // 2) Compute uniform spacing distance based on average path length
  const avgPathLength = totalLength / pathEntries.length;
  const spacingDist = avgPathLength / Math.max(count, 1);

  // 3) Each path gets points proportional to its own length, grouped by glyph
  const byGlyph = {};
  for (const { segments, pathLength, toLocal, glyphIndex } of pathEntries) {
    const localCount = Math.max(1, Math.round(pathLength / spacingDist));
    const pts = samplePoints(segments, localCount, spacing);
    if (!byGlyph[glyphIndex]) byGlyph[glyphIndex] = [];
    for (const pt of pts) {
      byGlyph[glyphIndex].push(toLocal(pt));
    }
  }

  return Object.entries(byGlyph).map(([idx, points]) => ({
    glyphIndex: Number(idx),
    points,
  }));
}
