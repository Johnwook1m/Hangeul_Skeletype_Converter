import { getGlyphEndpoints } from './pathEndpoints';

const DECAY = 0.65; // fixed shrink factor per recursion level

/**
 * Recursively generate branch paths from a single origin point.
 */
function generateBranches(ox, oy, dirAngle, length, widthRatio, depth, params) {
  if (depth <= 0 || length < 1) return [];

  const { angle, count } = params;
  const angleRad = (angle * Math.PI) / 180;
  const paths = [];

  // Spread branches symmetrically around the direction
  const offsets = [];
  if (count === 1) {
    offsets.push(0);
  } else {
    for (let i = 0; i < count; i++) {
      offsets.push(-angleRad + (2 * angleRad * i) / (count - 1));
    }
  }

  for (const offset of offsets) {
    const branchAngle = dirAngle + offset;
    const ex = ox + Math.cos(branchAngle) * length;
    const ey = oy + Math.sin(branchAngle) * length;

    paths.push({
      d: `M ${ox} ${oy} L ${ex} ${ey}`,
      widthRatio,
    });

    // Recurse from the branch tip
    const childPaths = generateBranches(
      ex, ey,
      branchAngle,
      length * DECAY,
      widthRatio * DECAY,
      depth - 1,
      params,
    );
    paths.push(...childPaths);
  }

  return paths;
}

/**
 * Compute branch paths for all glyph endpoints.
 * Each branch's widthRatio is relative to 1.0 (multiplied by strokeParams.width at render time).
 */
export function computeBranches(glyphList, branchParams, fontToDisplay) {
  if (!branchParams.enabled || glyphList.length === 0) return [];

  const { angle, count, length, depth } = branchParams;
  const allPaths = [];

  for (const glyph of glyphList) {
    if (!glyph.centerline) continue;

    const endpoints = getGlyphEndpoints(glyph, fontToDisplay);

    for (const ep of endpoints) {
      const dirAngle = Math.atan2(ep.ty, ep.tx);

      const branches = generateBranches(
        ep.x, ep.y,
        dirAngle,
        length,
        1.0,
        depth,
        { angle, count },
      );
      allPaths.push(...branches);
    }
  }

  return allPaths;
}
