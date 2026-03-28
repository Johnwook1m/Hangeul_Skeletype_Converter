/**
 * SVG path `d` 문자열의 모든 좌표에 어파인 변환 함수를 적용합니다.
 *
 * @param {string} d - SVG path d 속성 문자열
 * @param {(x: number, y: number) => [number, number]} transformFn - 좌표 변환 함수
 * @returns {string} 변환된 path d 문자열
 */
export function applyTransformToPath(d, transformFn) {
  if (!d) return d;

  // 토큰 파싱: 명령어(문자)와 숫자를 분리
  const tokens = d.match(/[MmLlCcQqHhVvZzSsTtAa]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
  if (!tokens) return d;

  const result = [];
  let i = 0;
  let cx = 0; // 현재 x 위치 (상대 좌표 추적용)
  let cy = 0; // 현재 y 위치

  const num = () => parseFloat(tokens[i++]);

  while (i < tokens.length) {
    const cmd = tokens[i++];

    switch (cmd) {
      case 'M': {
        const x = num(), y = num();
        const [tx, ty] = transformFn(x, y);
        result.push(`M ${tx} ${ty}`);
        cx = x; cy = y;
        // 연속 좌표는 L로 처리
        while (i < tokens.length && !isNaN(+tokens[i])) {
          const x2 = num(), y2 = num();
          const [tx2, ty2] = transformFn(x2, y2);
          result.push(`L ${tx2} ${ty2}`);
          cx = x2; cy = y2;
        }
        break;
      }
      case 'm': {
        const dx = num(), dy = num();
        cx += dx; cy += dy;
        const [tx, ty] = transformFn(cx, cy);
        result.push(`M ${tx} ${ty}`);
        while (i < tokens.length && !isNaN(+tokens[i])) {
          const dx2 = num(), dy2 = num();
          cx += dx2; cy += dy2;
          const [tx2, ty2] = transformFn(cx, cy);
          result.push(`L ${tx2} ${ty2}`);
        }
        break;
      }
      case 'L': {
        while (i < tokens.length && !isNaN(+tokens[i])) {
          const x = num(), y = num();
          const [tx, ty] = transformFn(x, y);
          result.push(`L ${tx} ${ty}`);
          cx = x; cy = y;
        }
        break;
      }
      case 'l': {
        while (i < tokens.length && !isNaN(+tokens[i])) {
          const dx = num(), dy = num();
          cx += dx; cy += dy;
          const [tx, ty] = transformFn(cx, cy);
          result.push(`L ${tx} ${ty}`);
        }
        break;
      }
      case 'C': {
        while (i < tokens.length && !isNaN(+tokens[i])) {
          const x1 = num(), y1 = num();
          const x2 = num(), y2 = num();
          const x = num(), y = num();
          const [tx1, ty1] = transformFn(x1, y1);
          const [tx2, ty2] = transformFn(x2, y2);
          const [tx, ty] = transformFn(x, y);
          result.push(`C ${tx1} ${ty1} ${tx2} ${ty2} ${tx} ${ty}`);
          cx = x; cy = y;
        }
        break;
      }
      case 'c': {
        while (i < tokens.length && !isNaN(+tokens[i])) {
          const dx1 = num(), dy1 = num();
          const dx2 = num(), dy2 = num();
          const dx = num(), dy = num();
          const [tx1, ty1] = transformFn(cx + dx1, cy + dy1);
          const [tx2, ty2] = transformFn(cx + dx2, cy + dy2);
          const nx = cx + dx, ny = cy + dy;
          const [tx, ty] = transformFn(nx, ny);
          result.push(`C ${tx1} ${ty1} ${tx2} ${ty2} ${tx} ${ty}`);
          cx = nx; cy = ny;
        }
        break;
      }
      case 'Q': {
        while (i < tokens.length && !isNaN(+tokens[i])) {
          const x1 = num(), y1 = num();
          const x = num(), y = num();
          const [tx1, ty1] = transformFn(x1, y1);
          const [tx, ty] = transformFn(x, y);
          result.push(`Q ${tx1} ${ty1} ${tx} ${ty}`);
          cx = x; cy = y;
        }
        break;
      }
      case 'q': {
        while (i < tokens.length && !isNaN(+tokens[i])) {
          const dx1 = num(), dy1 = num();
          const dx = num(), dy = num();
          const [tx1, ty1] = transformFn(cx + dx1, cy + dy1);
          const nx = cx + dx, ny = cy + dy;
          const [tx, ty] = transformFn(nx, ny);
          result.push(`Q ${tx1} ${ty1} ${tx} ${ty}`);
          cx = nx; cy = ny;
        }
        break;
      }
      case 'H': {
        while (i < tokens.length && !isNaN(+tokens[i])) {
          const x = num();
          const [tx, ty] = transformFn(x, cy);
          result.push(`L ${tx} ${ty}`);
          cx = x;
        }
        break;
      }
      case 'h': {
        while (i < tokens.length && !isNaN(+tokens[i])) {
          const dx = num();
          cx += dx;
          const [tx, ty] = transformFn(cx, cy);
          result.push(`L ${tx} ${ty}`);
        }
        break;
      }
      case 'V': {
        while (i < tokens.length && !isNaN(+tokens[i])) {
          const y = num();
          const [tx, ty] = transformFn(cx, y);
          result.push(`L ${tx} ${ty}`);
          cy = y;
        }
        break;
      }
      case 'v': {
        while (i < tokens.length && !isNaN(+tokens[i])) {
          const dy = num();
          cy += dy;
          const [tx, ty] = transformFn(cx, cy);
          result.push(`L ${tx} ${ty}`);
        }
        break;
      }
      case 'Z':
      case 'z': {
        result.push('Z');
        break;
      }
      default:
        // 알 수 없는 명령어는 그대로 통과
        result.push(cmd);
        break;
    }
  }

  return result.join(' ');
}
