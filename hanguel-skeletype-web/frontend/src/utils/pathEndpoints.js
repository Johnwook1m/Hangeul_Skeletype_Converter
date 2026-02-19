/**
 * Normalize a 2D vector to unit length. Returns {x:1,y:0} for zero vectors.
 */
function normalize(dx, dy) {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-9) return { x: 1, y: 0 };
  return { x: dx / len, y: dy / len };
}

/**
 * Parse SVG path `d` string to extract start/end coordinates AND tangent vectors.
 * Supports M, L, C, Q, Z commands (absolute and relative).
 *
 * @param {string} d - SVG path data string
 * @returns {{ start: {x, y}, end: {x, y}, startTangent: {x, y}, endTangent: {x, y} } | null}
 *   startTangent: unit vector pointing away from start (outward direction)
 *   endTangent: unit vector pointing away from end (outward direction)
 */
export function parseSvgPathEndpoints(d) {
  if (!d || typeof d !== 'string') return null;

  // Tokenize: split into commands and numbers
  const tokens = d.match(/[MmLlCcQqSsTtAaHhVvZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
  if (!tokens) return null;

  let startX = null, startY = null; // First M point (subpath start)
  let curX = 0, curY = 0;          // Current position
  let firstMove = true;

  // Track tangent info: the "next point" after start, and the "prev point" before end
  let firstNextX = null, firstNextY = null; // first point after start M (for start tangent)
  let prevX = 0, prevY = 0;                 // point before current end (for end tangent)
  let commandCount = 0;

  let i = 0;
  while (i < tokens.length) {
    const cmd = tokens[i];

    // Skip if token is a number (shouldn't happen at command position)
    if (!/[A-Za-z]/.test(cmd)) { i++; continue; }
    i++;

    const nums = [];
    while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
      nums.push(parseFloat(tokens[i]));
      i++;
    }

    switch (cmd) {
      case 'M':
        for (let j = 0; j < nums.length - 1; j += 2) {
          prevX = curX; prevY = curY;
          curX = nums[j]; curY = nums[j + 1];
          if (firstMove) { startX = curX; startY = curY; firstMove = false; }
        }
        break;
      case 'm':
        for (let j = 0; j < nums.length - 1; j += 2) {
          prevX = curX; prevY = curY;
          curX += nums[j]; curY += nums[j + 1];
          if (firstMove) { startX = curX; startY = curY; firstMove = false; }
        }
        break;
      case 'L':
        for (let j = 0; j < nums.length - 1; j += 2) {
          prevX = curX; prevY = curY;
          curX = nums[j]; curY = nums[j + 1];
          commandCount++;
          if (firstNextX === null) { firstNextX = curX; firstNextY = curY; }
        }
        break;
      case 'l':
        for (let j = 0; j < nums.length - 1; j += 2) {
          prevX = curX; prevY = curY;
          curX += nums[j]; curY += nums[j + 1];
          commandCount++;
          if (firstNextX === null) { firstNextX = curX; firstNextY = curY; }
        }
        break;
      case 'H':
        if (nums.length > 0) {
          prevX = curX; prevY = curY;
          curX = nums[nums.length - 1];
          commandCount++;
          if (firstNextX === null) { firstNextX = curX; firstNextY = curY; }
        }
        break;
      case 'h':
        for (let j = 0; j < nums.length; j++) {
          prevX = curX; prevY = curY;
          curX += nums[j];
          commandCount++;
          if (firstNextX === null) { firstNextX = curX; firstNextY = curY; }
        }
        break;
      case 'V':
        if (nums.length > 0) {
          prevX = curX; prevY = curY;
          curY = nums[nums.length - 1];
          commandCount++;
          if (firstNextX === null) { firstNextX = curX; firstNextY = curY; }
        }
        break;
      case 'v':
        for (let j = 0; j < nums.length; j++) {
          prevX = curX; prevY = curY;
          curY += nums[j];
          commandCount++;
          if (firstNextX === null) { firstNextX = curX; firstNextY = curY; }
        }
        break;
      case 'C':
        for (let j = 0; j < nums.length - 5; j += 6) {
          // For C: control point 2 (nums[j+2],nums[j+3]) is closest to the end point
          prevX = nums[j + 2]; prevY = nums[j + 3];
          curX = nums[j + 4]; curY = nums[j + 5];
          commandCount++;
          // For start tangent: first control point is the direction from start
          if (firstNextX === null) { firstNextX = nums[j]; firstNextY = nums[j + 1]; }
        }
        break;
      case 'c':
        for (let j = 0; j < nums.length - 5; j += 6) {
          const baseX = curX, baseY = curY;
          prevX = baseX + nums[j + 2]; prevY = baseY + nums[j + 3];
          curX = baseX + nums[j + 4]; curY = baseY + nums[j + 5];
          commandCount++;
          if (firstNextX === null) { firstNextX = baseX + nums[j]; firstNextY = baseY + nums[j + 1]; }
        }
        break;
      case 'Q':
        for (let j = 0; j < nums.length - 3; j += 4) {
          prevX = nums[j]; prevY = nums[j + 1]; // control point
          curX = nums[j + 2]; curY = nums[j + 3];
          commandCount++;
          if (firstNextX === null) { firstNextX = nums[j]; firstNextY = nums[j + 1]; }
        }
        break;
      case 'q':
        for (let j = 0; j < nums.length - 3; j += 4) {
          const baseX = curX, baseY = curY;
          prevX = baseX + nums[j]; prevY = baseY + nums[j + 1];
          curX = baseX + nums[j + 2]; curY = baseY + nums[j + 3];
          commandCount++;
          if (firstNextX === null) { firstNextX = baseX + nums[j]; firstNextY = baseY + nums[j + 1]; }
        }
        break;
      case 'S':
        for (let j = 0; j < nums.length - 3; j += 4) {
          prevX = nums[j]; prevY = nums[j + 1];
          curX = nums[j + 2]; curY = nums[j + 3];
          commandCount++;
          if (firstNextX === null) { firstNextX = nums[j]; firstNextY = nums[j + 1]; }
        }
        break;
      case 's':
        for (let j = 0; j < nums.length - 3; j += 4) {
          const baseX = curX, baseY = curY;
          prevX = baseX + nums[j]; prevY = baseY + nums[j + 1];
          curX = baseX + nums[j + 2]; curY = baseY + nums[j + 3];
          commandCount++;
          if (firstNextX === null) { firstNextX = baseX + nums[j]; firstNextY = baseY + nums[j + 1]; }
        }
        break;
      case 'T':
        for (let j = 0; j < nums.length - 1; j += 2) {
          prevX = curX; prevY = curY;
          curX = nums[j]; curY = nums[j + 1];
          commandCount++;
          if (firstNextX === null) { firstNextX = curX; firstNextY = curY; }
        }
        break;
      case 't':
        for (let j = 0; j < nums.length - 1; j += 2) {
          prevX = curX; prevY = curY;
          curX += nums[j]; curY += nums[j + 1];
          commandCount++;
          if (firstNextX === null) { firstNextX = curX; firstNextY = curY; }
        }
        break;
      case 'A':
        for (let j = 0; j < nums.length - 6; j += 7) {
          prevX = curX; prevY = curY;
          curX = nums[j + 5]; curY = nums[j + 6];
          commandCount++;
          if (firstNextX === null) { firstNextX = curX; firstNextY = curY; }
        }
        break;
      case 'a':
        for (let j = 0; j < nums.length - 6; j += 7) {
          prevX = curX; prevY = curY;
          curX += nums[j + 5]; curY += nums[j + 6];
          commandCount++;
          if (firstNextX === null) { firstNextX = curX; firstNextY = curY; }
        }
        break;
      case 'Z':
      case 'z':
        if (startX !== null) {
          prevX = curX; prevY = curY;
          curX = startX; curY = startY;
        }
        break;
    }
  }

  if (startX === null) return null;

  // Start tangent: points away from start (reverse of start→firstNext direction)
  const fnx = firstNextX ?? curX;
  const fny = firstNextY ?? curY;
  const startTangent = normalize(startX - fnx, startY - fny);

  // End tangent: points away from end (direction from prev→end, continuing outward)
  const endTangent = normalize(curX - prevX, curY - prevY);

  return {
    start: { x: startX, y: startY },
    end: { x: curX, y: curY },
    startTangent,
    endTangent,
  };
}

/**
 * Extract all endpoints from a glyph's centerline paths and convert to display coordinates.
 * Each endpoint includes a tangent unit vector pointing outward from the path.
 *
 * @param {object} glyph - Glyph render data from GlyphPreview (with centerline, xOffset, yOffset, K)
 * @param {number} fontToDisplay - Font-to-display scale factor
 * @param {number} RASTER_PADDING - Rasterizer padding (default 20)
 * @returns {{ x: number, y: number, tx: number, ty: number }[]} Array of endpoint coordinates + tangent in display space
 */
export function getGlyphEndpoints(glyph, fontToDisplay, RASTER_PADDING = 20) {
  if (!glyph.centerline || !glyph.centerline.paths) return [];

  const { K } = glyph;
  const bounds = glyph.centerline.bounds || {};
  const xMin = bounds.xMin || 0;

  // Same transforms as GlyphPreview.jsx
  const clTranslateX = xMin * fontToDisplay - RASTER_PADDING * K;
  const clTranslateY = -RASTER_PADDING * K;

  const endpoints = [];

  for (const pathD of glyph.centerline.paths) {
    const parsed = parseSvgPathEndpoints(pathD);
    if (!parsed) continue;

    // Convert from pixel space to display space:
    // display = glyphOffset + (pixel * K) + clTranslate
    // Tangent vectors are direction-only so they don't need translation, but K scaling
    // preserves direction (uniform scale), so tangent unit vectors stay the same.
    const pairs = [
      { pt: parsed.start, tangent: parsed.startTangent },
      { pt: parsed.end, tangent: parsed.endTangent },
    ];
    for (const { pt, tangent } of pairs) {
      endpoints.push({
        x: glyph.xOffset + pt.x * K + clTranslateX,
        y: glyph.yOffset + pt.y * K + clTranslateY,
        tx: tangent.x,
        ty: tangent.y,
      });
    }
  }

  return endpoints;
}
