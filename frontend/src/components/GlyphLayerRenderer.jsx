import { useMemo } from 'react';
import { computeConnections } from '../utils/glyphConnections';
import { computeBranches } from '../utils/glyphBranches';
import { computeDecorators } from '../utils/glyphDecorators';
import { computeOffsetPaths } from '../utils/glyphOffsetPath';
import { applyTransformToPath } from '../utils/transformPath';

// Must match backend rasterizer.py padding=20
const RASTER_PADDING = 20;

/**
 * 단일 레이어의 SVG 렌더링 담당.
 * GlyphPreview에서 분리된 서브컴포넌트 — 레이어별 독립 useMemo 보유.
 */
export default function GlyphLayerRenderer({
  layer,
  glyphList,
  fontToDisplay,
  fontAscender,
  EM_UNIT,
  theme,
  showFlesh,
}) {
  const { strokeParams, slantParams, connectionParams, branchParams, decoratorParams, offsetPathParams } = layer;

  // scaleX/scaleY는 per-layer strokeParams에서 읽음 (visible 플래그 반영)
  const scaleX = (strokeParams.scaleXVisible !== false) ? (strokeParams.scaleX ?? 1) : 1;
  const scaleY = (strokeParams.scaleYVisible !== false) ? (strokeParams.scaleY ?? 1) : 1;

  // ─── 레이어별 독립 computed values ────────────────────────────────────────────

  const slantAngle = slantParams.enabled && slantParams.visible !== false ? slantParams.angle : 0;

  const connections = useMemo(
    () => computeConnections(glyphList, connectionParams, fontToDisplay, scaleX, scaleY, slantAngle, fontAscender),
    [glyphList, connectionParams, fontToDisplay, scaleX, scaleY, slantAngle, fontAscender]
  );

  const branches = useMemo(
    () => computeBranches(glyphList, branchParams, fontToDisplay, scaleX, scaleY, slantAngle, fontAscender),
    [glyphList, branchParams, fontToDisplay, scaleX, scaleY, slantAngle, fontAscender]
  );

  const decoratorPointsByGlyph = useMemo(
    () => computeDecorators(glyphList, decoratorParams, fontToDisplay),
    [glyphList, decoratorParams, fontToDisplay]
  );

  const decoratorsByIndex = useMemo(() => {
    const map = {};
    for (const { glyphIndex, points } of decoratorPointsByGlyph) {
      map[glyphIndex] = points;
    }
    return map;
  }, [decoratorPointsByGlyph]);

  const offsetRingPaths = useMemo(
    () => computeOffsetPaths(glyphList, offsetPathParams),
    [glyphList, offsetPathParams]
  );

  const offsetRingsByIndex = useMemo(() => {
    const map = {};
    for (const { glyphIndex, paths } of offsetRingPaths) {
      map[glyphIndex] = paths;
    }
    return map;
  }, [offsetRingPaths]);

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <g>
      {/* Per-glyph rendering */}
      {glyphList.map((glyph, index) => {
        if (!glyph.centerline) return null; // 센터라인 없는 글리프는 GlyphPreview의 placeholder가 처리

        const { K, rasterScale } = glyph;
        const glyphOutline = glyph.centerline.outline;
        const bounds = glyph.centerline.bounds || {};
        const xMin = bounds.xMin || 0;
        const glyphAscender = glyph.centerline.ascender ?? fontAscender;

        // Centerline transform: pixel coords → display coords
        const clTranslateX = xMin * fontToDisplay - RASTER_PADDING * K;
        const clTranslateY = -RASTER_PADDING * K;

        // Outline transform: font coords → display coords
        const outlineTransform = glyphOutline
          ? `scale(${fontToDisplay}, ${-fontToDisplay}) translate(0, ${-glyphAscender})`
          : '';

        // Baseline position in display coords
        const baselineY = glyphAscender * fontToDisplay;
        const needsTransform = scaleX !== 1 || scaleY !== 1 || slantAngle !== 0;
        const scaleTransform = needsTransform
          ? `translate(0, ${baselineY * (1 - scaleY)}) scale(${scaleX}, ${scaleY}) translate(0, ${baselineY}) skewX(${-slantAngle}) translate(0, ${-baselineY})`
          : '';

        // 센터라인 경로를 픽셀 공간 → 디스플레이 공간 + scaleX/scaleY/slant 사전 변환
        const tanSlant = Math.tan(slantAngle * Math.PI / 180);
        const pointTransform = (px, py) => {
          const dx = clTranslateX + px * K;
          const dy = clTranslateY + py * K;
          const fx = scaleX * dx - scaleX * tanSlant * (dy - baselineY);
          const fy = scaleY * (dy - baselineY) + baselineY;
          return [fx, fy];
        };
        const transformedPaths = glyph.centerline.paths.map(d => applyTransformToPath(d, pointTransform));

        // 디스플레이 공간 기준 stroke 두께 (균일)
        const displayStrokeWidth = strokeParams.width * fontToDisplay;

        return (
          <g key={index} transform={`translate(${glyph.xOffset}, ${glyph.yOffset})`}>
            {/* 1. Flesh + 오프셋 링: scaleTransform 내부, stroke 뒤에 렌더링 */}
            <g transform={scaleTransform || undefined}>
              {showFlesh && glyphOutline && glyphOutline.path && (
                <g transform={outlineTransform}>
                  <path
                    d={glyphOutline.path}
                    fill={theme === 'dark' ? '#ffffff' : '#000000'}
                    fillOpacity={0.4}
                    stroke="none"
                  />
                </g>
              )}

              {/* Offset path ring: 픽셀 공간 경로 (후속 작업: 현재는 scaleTransform 내부 유지) */}
              <g transform={`translate(${clTranslateX}, ${clTranslateY}) scale(${K})`}>
                {offsetPathParams.enabled && offsetPathParams.visible !== false && (offsetRingsByIndex[index] || []).map((d, pi) => (
                  <path
                    key={`offset-${pi}`}
                    d={d}
                    fill="none"
                    stroke={offsetPathParams.color}
                    strokeWidth={offsetPathParams.weight}
                    strokeLinecap={offsetPathParams.corner === 'round' ? 'round' : 'square'}
                    strokeLinejoin={offsetPathParams.corner === 'round' ? 'round' : 'miter'}
                  />
                ))}
              </g>
            </g>

            {/* 2. 센터라인 stroke: 사전 변환된 경로 — scale 트랜스폼 없이 균일한 두께 */}
            {transformedPaths.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={strokeParams.strokeColor}
                strokeWidth={displayStrokeWidth}
                strokeLinecap={strokeParams.cap}
                strokeLinejoin={strokeParams.join}
              />
            ))}

            {/* 3. 얇은 센터라인 참조선 (사전 변환) */}
            {transformedPaths.map((d, i) => (
              <path
                key={`ref-${i}`}
                d={d}
                fill="none"
                stroke={strokeParams.centerlineColor}
                strokeWidth={3}
                opacity={0.9}
              />
            ))}

            {/* 4. 데코레이터: scaleTransform 내부, stroke 위에 렌더링 */}
            {decoratorParams.enabled && decoratorParams.visible !== false && decoratorsByIndex[index] && (
              <g transform={scaleTransform || undefined}>
                {decoratorsByIndex[index].map((pt, i) => {
                  const s = decoratorParams.size;
                  const fill = decoratorParams.filled ? decoratorParams.color : 'none';
                  const stroke = decoratorParams.filled ? 'none' : decoratorParams.color;
                  const sw = decoratorParams.filled ? 0 : strokeParams.width * fontToDisplay * 0.3;
                  switch (decoratorParams.shape) {
                    case 'circle':
                      return (
                        <circle key={`dec-${i}`} cx={pt.x} cy={pt.y} r={s / 2}
                          fill={fill} stroke={stroke} strokeWidth={sw} />
                      );
                    case 'square':
                      return (
                        <rect key={`dec-${i}`} x={pt.x - s / 2} y={pt.y - s / 2}
                          width={s} height={s} fill={fill} stroke={stroke} strokeWidth={sw} />
                      );
                    case 'diamond':
                      return (
                        <polygon key={`dec-${i}`}
                          points={`${pt.x},${pt.y - s / 2} ${pt.x + s / 2},${pt.y} ${pt.x},${pt.y + s / 2} ${pt.x - s / 2},${pt.y}`}
                          fill={fill} stroke={stroke} strokeWidth={sw} />
                      );
                    case 'triangle':
                      return (
                        <polygon key={`dec-${i}`}
                          points={`${pt.x},${pt.y - s * 0.577} ${pt.x + s / 2},${pt.y + s * 0.289} ${pt.x - s / 2},${pt.y + s * 0.289}`}
                          fill={fill} stroke={stroke} strokeWidth={sw} />
                      );
                    default:
                      return null;
                  }
                })}
              </g>
            )}
          </g>
        );
      })}

      {/* Branch lines */}
      {branchParams.enabled && branchParams.visible !== false && branches.length > 0 && (
        <g>
          {branches.map((b, i) => (
            <path
              key={`branch-${i}`}
              d={b.d}
              fill="none"
              stroke={branchParams.color}
              strokeWidth={b.widthRatio * strokeParams.width * fontToDisplay}
              strokeLinecap="round"
            />
          ))}
        </g>
      )}

      {/* Connection lines */}
      {connectionParams.enabled && connectionParams.visible !== false && connections.length > 0 && (
        <g>
          {connections.map((conn, i) => (
            <path
              key={`conn-${i}`}
              d={conn.d}
              fill="none"
              stroke={connectionParams.color}
              strokeWidth={strokeParams.width * fontToDisplay}
              strokeLinecap={strokeParams.cap}
              strokeLinejoin={strokeParams.join}
            />
          ))}
        </g>
      )}
    </g>
  );
}
