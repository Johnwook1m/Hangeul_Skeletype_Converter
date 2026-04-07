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
  maxRowWidth,
  totalRows,
}) {
  const { strokeParams, slantParams, connectionParams, branchParams, decoratorParams, offsetPathParams } = layer;

  // scaleX/scaleY는 per-layer strokeParams에서 읽음 (visible 플래그 반영)
  const scaleX = (strokeParams.scaleXVisible !== false) ? (strokeParams.scaleX ?? 1) : 1;
  const scaleY = (strokeParams.scaleYVisible !== false) ? (strokeParams.scaleY ?? 1) : 1;

  // ─── 레이어별 독립 computed values ────────────────────────────────────────────

  const slantAngle = slantParams.enabled && slantParams.visible !== false ? slantParams.angle : 0;

  // 전체 텍스트 중심 기준 위치 조정된 glyphList (connection/branch 계산용)
  const adjustedGlyphList = useMemo(() => {
    const cx = maxRowWidth / 2;
    const cy = totalRows * EM_UNIT / 2;
    return glyphList.map(g => ({
      ...g,
      xOffset: cx + scaleX * (g.xOffset - cx),
      yOffset: cy + scaleY * (g.yOffset - cy),
    }));
  }, [glyphList, maxRowWidth, totalRows, EM_UNIT, scaleX, scaleY]);

  const connections = useMemo(
    () => computeConnections(adjustedGlyphList, connectionParams, fontToDisplay, scaleX, scaleY, slantAngle, fontAscender),
    [adjustedGlyphList, connectionParams, fontToDisplay, scaleX, scaleY, slantAngle, fontAscender]
  );

  const branches = useMemo(
    () => computeBranches(adjustedGlyphList, branchParams, fontToDisplay, scaleX, scaleY, slantAngle, fontAscender),
    [adjustedGlyphList, branchParams, fontToDisplay, scaleX, scaleY, slantAngle, fontAscender]
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

        // 전체 텍스트 중심 기준으로 글리프 위치 조정
        const globalCenterX = maxRowWidth / 2;
        const adjustedXOffset = globalCenterX + scaleX * (glyph.xOffset - globalCenterX);
        const globalCenterY = totalRows * EM_UNIT / 2;
        const adjustedYOffset = globalCenterY + scaleY * (glyph.yOffset - globalCenterY);

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
          <g key={index} transform={`translate(${adjustedXOffset}, ${adjustedYOffset})`}>
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

            {/* 4. 데코레이터: 좌표만 변환하여 왜곡 없이 렌더링 */}
            {decoratorParams.enabled && decoratorParams.visible !== false && decoratorsByIndex[index] && (
              <g>
                {decoratorsByIndex[index].map((pt, i) => {
                  // 데코레이터 좌표를 scaleX/scaleY/slant 적용 (도형 크기는 유지)
                  const tx = scaleX * pt.x - scaleX * tanSlant * (pt.y - baselineY);
                  const ty = scaleY * (pt.y - baselineY) + baselineY;
                  const s = decoratorParams.size;
                  const fill = decoratorParams.filled ? decoratorParams.color : 'none';
                  const stroke = decoratorParams.filled ? 'none' : decoratorParams.color;
                  const sw = decoratorParams.filled ? 0 : strokeParams.width * fontToDisplay * 0.3;
                  const baseDeg = (pt.angle ?? 0) * 180 / Math.PI + (decoratorParams.rotation ?? 0);
                  switch (decoratorParams.shape) {
                    case 'circle':
                      return (
                        <circle key={`dec-${i}`} cx={tx} cy={ty} r={s / 2}
                          fill={fill} stroke={stroke} strokeWidth={sw} />
                      );
                    case 'square':
                      return (
                        <rect key={`dec-${i}`} x={tx - s / 2} y={ty - s / 2}
                          width={s} height={s} fill={fill} stroke={stroke} strokeWidth={sw}
                          transform={`rotate(${baseDeg} ${tx} ${ty})`} />
                      );
                    case 'diamond':
                      return (
                        <polygon key={`dec-${i}`}
                          points={`${tx},${ty - s / 2} ${tx + s / 2},${ty} ${tx},${ty + s / 2} ${tx - s / 2},${ty}`}
                          fill={fill} stroke={stroke} strokeWidth={sw}
                          transform={`rotate(${baseDeg} ${tx} ${ty})`} />
                      );
                    case 'triangle':
                      return (
                        <polygon key={`dec-${i}`}
                          points={`${tx},${ty - s * 0.577} ${tx + s / 2},${ty + s * 0.289} ${tx - s / 2},${ty + s * 0.289}`}
                          fill={fill} stroke={stroke} strokeWidth={sw}
                          transform={`rotate(${baseDeg + 90} ${tx} ${ty})`} />
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
