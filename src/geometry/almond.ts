/** Soft almond（软杏仁）平面轮廓与 C 曲 / 纵拱标量场。单位：毫米。 */

export function clamp01(s: number): number {
  return Math.min(1, Math.max(0, s));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * 半宽：甲沟圆钝、中段接近平行、远端椭圆收成圆尖。
 * s = 0 甲沟，s = 1 游离缘。
 */
export function almondHalfWidth(s: number, widthMm: number): number {
  const maxHalf = widthMm / 2;
  const u = clamp01(s);
  const cuticle = 0.56 + 0.44 * smoothstep(0, 0.11, u);
  const taperStart = 0.46;
  const tipRatio = 0.1;
  let distal = 1;
  if (u > taperStart) {
    const t = (u - taperStart) / (1 - taperStart);
    const n = 2.05;
    const raw = Math.pow(Math.max(0, 1 - Math.pow(t, n)), 1 / n);
    distal = tipRatio + (1 - tipRatio) * raw;
  }
  return maxHalf * cuticle * distal;
}

/**
 * 圆弓 C 曲：弦宽 2*halfW，矢高 cDepth。
 * x=0 处 z=cDepth，两侧 z=0。
 */
export function cCurveZ(x: number, halfW: number, cDepth: number): number {
  const hw = Math.max(halfW, 1e-6);
  const c = Math.min(Math.max(cDepth, 0), hw * 0.92);
  if (c < 1e-8) return 0;
  const radius = (c * c + hw * hw) / (2 * c);
  const xClamped = Math.min(Math.abs(x), hw);
  return Math.sqrt(Math.max(radius * radius - xClamped * xClamped, 0)) - (radius - c);
}

/** 随宽度收敛 C 深，避免尖端变成半圆管；最宽处保持目标 C 深。 */
export function localCDepth(halfW: number, widthMm: number, cDepthMm: number): number {
  const maxHalf = Math.max(widthMm / 2, 1e-6);
  const scale = Math.min(1, halfW / (maxHalf * 0.92));
  return cDepthMm * scale;
}

/**
 * 纵向拱：甲沟与尖端为 0，apex 附近为 archMm。
 * 侧壁轮廓的矢高即纵拱（不含 C 曲）。
 */
export function longitudinalArch(s: number, archMm: number, peak = 0.4): number {
  const u = clamp01(s);
  if (u <= 0 || u >= 1) return 0;
  const warp = Math.log(0.5) / Math.log(peak);
  const t = Math.pow(u, warp);
  return archMm * Math.sin(Math.PI * t);
}

export function sampleOutline(
  lengthMm: number,
  widthMm: number,
  samples = 64,
): { s: number; halfW: number; y: number }[] {
  const out = [];
  for (let i = 0; i < samples; i++) {
    const s = i / (samples - 1);
    out.push({ s, halfW: almondHalfWidth(s, widthMm), y: s * lengthMm });
  }
  return out;
}
