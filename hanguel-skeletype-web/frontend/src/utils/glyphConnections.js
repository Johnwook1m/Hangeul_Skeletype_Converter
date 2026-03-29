import { getGlyphEndpoints } from './pathEndpoints';

/**
 * Generate an SVG path `d` string connecting two points with the given shape.
 */
function buildConnectionPath(p1, p2, shape, params) {
  const { tension, waveAmplitude, waveFrequency } = params;

  if (shape === 'line') {
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
  }

  if (shape === 'curve') {
    const dx = p2.x - p1.x;
    const cx1 = p1.x + dx * tension;
    const cy1 = p1.y;
    const cx2 = p2.x - dx * tension;
    const cy2 = p2.y;
    return `M ${p1.x} ${p1.y} C ${cx1} ${cy1} ${cx2} ${cy2} ${p2.x} ${p2.y}`;
  }

  if (shape === 'wave') {
    // Build wave using cubic bezier segments along the line
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;

    const segments = Math.max(1, Math.round(waveFrequency));
    const segLen = 1 / segments;
    // Perpendicular direction for wave displacement
    const nx = -dy / dist;
    const ny = dx / dist;

    let d = `M ${p1.x} ${p1.y}`;
    for (let i = 0; i < segments; i++) {
      const t0 = i * segLen;
      const t1 = (i + 0.5) * segLen;
      const t2 = (i + 1) * segLen;
      const sign = i % 2 === 0 ? 1 : -1;

      // Mid-point displaced perpendicular
      const mx = p1.x + dx * t1 + nx * waveAmplitude * sign;
      const my = p1.y + dy * t1 + ny * waveAmplitude * sign;
      // End of this segment
      const ex = p1.x + dx * t2;
      const ey = p1.y + dy * t2;

      // Quadratic-ish via cubic: control points pull toward the displaced mid
      const cp1x = p1.x + dx * (t0 + segLen * 0.25) + nx * waveAmplitude * sign * 0.8;
      const cp1y = p1.y + dy * (t0 + segLen * 0.25) + ny * waveAmplitude * sign * 0.8;
      const cp2x = p1.x + dx * (t0 + segLen * 0.75) + nx * waveAmplitude * sign * 0.8;
      const cp2y = p1.y + dy * (t0 + segLen * 0.75) + ny * waveAmplitude * sign * 0.8;

      d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${ex} ${ey}`;
    }
    return d;
  }

  return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
}

/**
 * Compute connections between adjacent glyphs.
 *
 * @param {object[]} glyphList - Array of glyph render data from GlyphPreview
 * @param {object} connectionParams - Connection parameters from store
 * @param {number} fontToDisplay - Font-to-display scale factor
 * @returns {{ d: string }[]} Array of connection path data
 */
export function computeConnections(glyphList, connectionParams, fontToDisplay, scaleX = 1, scaleY = 1, slantAngle = 0, fontAscender = 800) {
  if (!connectionParams.enabled || glyphList.length < 2) return [];

  const { shape, maxDistance, maxConnections } = connectionParams;
  const connections = [];

  // Group glyphs by row (yOffset)
  const rows = new Map();
  for (let i = 0; i < glyphList.length; i++) {
    const g = glyphList[i];
    if (!g.centerline) continue;
    const rowKey = g.yOffset;
    if (!rows.has(rowKey)) rows.set(rowKey, []);
    rows.get(rowKey).push({ index: i, glyph: g });
  }

  for (const rowGlyphs of rows.values()) {
    // Sort by xOffset within row
    rowGlyphs.sort((a, b) => a.glyph.xOffset - b.glyph.xOffset);

    for (let r = 0; r < rowGlyphs.length - 1; r++) {
      const leftGlyph = rowGlyphs[r].glyph;
      const rightGlyph = rowGlyphs[r + 1].glyph;

      const leftEndpoints = getGlyphEndpoints(leftGlyph, fontToDisplay, 20, scaleX, scaleY, slantAngle, fontAscender);
      const rightEndpoints = getGlyphEndpoints(rightGlyph, fontToDisplay, 20, scaleX, scaleY, slantAngle, fontAscender);

      if (leftEndpoints.length === 0 || rightEndpoints.length === 0) continue;

      // Find the midpoint x between the two glyphs for classifying "right side" vs "left side"
      const leftAdvance = leftGlyph.xOffset + (leftGlyph.advanceWidth || 0) * fontToDisplay;
      const leftMidX = (leftGlyph.xOffset + leftAdvance) / 2;
      const rightMidX = (rightGlyph.xOffset + rightGlyph.xOffset + (rightGlyph.advanceWidth || 0) * fontToDisplay) / 2;

      // From left glyph: prefer endpoints on the right side (higher x)
      // From right glyph: prefer endpoints on the left side (lower x)
      // Build distance pairs
      const pairs = [];
      for (const lp of leftEndpoints) {
        for (const rp of rightEndpoints) {
          const dx = rp.x - lp.x;
          const dy = rp.y - lp.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= maxDistance) {
            // Prefer: left endpoint with high x, right endpoint with low x
            const leftBias = lp.x - leftMidX;  // positive = right side
            const rightBias = rightMidX - rp.x; // positive = left side
            const score = dist - (leftBias + rightBias) * 0.3; // lower is better
            pairs.push({ lp, rp, dist, score });
          }
        }
      }

      // Sort by score and pick top maxConnections
      pairs.sort((a, b) => a.score - b.score);
      const usedLeft = new Set();
      const usedRight = new Set();
      let count = 0;

      for (const pair of pairs) {
        if (count >= maxConnections) break;
        const lKey = `${pair.lp.x},${pair.lp.y}`;
        const rKey = `${pair.rp.x},${pair.rp.y}`;
        if (usedLeft.has(lKey) || usedRight.has(rKey)) continue;

        usedLeft.add(lKey);
        usedRight.add(rKey);
        count++;

        const d = buildConnectionPath(pair.lp, pair.rp, shape, connectionParams);
        connections.push({ d });
      }
    }
  }

  return connections;
}
