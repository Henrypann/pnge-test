import {
  INNER_SURFACE_KIND,
  type Chirality,
  type FingerName,
  type InnerSurfaceSpec,
} from "../contracts/pnge";
import { cCurveZ, clamp01, localCDepth, longitudinalArch, smoothstep } from "./almond";

/**
 * 独立参数化床面算法（parametric_bed_v1）
 *
 * 与 outer_form 共用 (s, v) 网格拓扑，但半宽、曲率、Z 全部由 InnerSurfaceSpec
 * 自己的字段决定，不读取外表面顶点，也不沿外法向移动。
 *
 * 参数域：
 *   s ∈ [0, 1]  甲沟 → 游离缘
 *   v ∈ [-1, 1] 左侧 → 右侧
 *
 * 半宽（与软杏仁外轮廓同族、不同系数）：
 *   halfW(s) = (bedWidthMm/2) * cuticle(s) * distal(s)
 *   cuticle(s) = cuticleBlunt + (1-cuticleBlunt) * smoothstep(0, 0.11, s)
 *   s > taperStart 时远端用指数 n=distalExponent 的超椭圆收尖，残留 tipRatio
 *
 * 位置：
 *   x = v * halfW(s)
 *   y = s * bedLengthMm
 *   z = bedZMm + longitudinalArch(s, bedArchMm, archPeak)
 *       + cCurveZ(x, halfW, localCDepth(halfW, bedWidthMm, bedCDepthMm))
 *
 * bedZMm 是床面整体高度，不是法向厚度。左右手在右手规范坐标采样后再镜像 X。
 *
 * 指纹：对 spec 全部字段 + 采样点做 pnge.fingerprint.v1+sha256（见 fingerprint.ts）。
 */

type BedPreset = Omit<InnerSurfaceSpec, "kind" | "finger" | "side">;

/**
 * 五指床面预设：手写参数，约等于对应外轮廓的 96–98%，曲率略扁。
 * 不是 outer 的缩放副本，系数（cuticleBlunt / distalExponent 等）按指独立填写。
 */
export const INNER_BED_PRESETS: Record<FingerName, BedPreset> = {
  thumb: {
    bedLengthMm: 18.82,
    bedWidthMm: 12.72,
    bedCDepthMm: 2.32,
    bedArchMm: 1.84,
    bedZMm: -0.78,
    cuticleBlunt: 0.53,
    distalExponent: 1.94,
    taperStart: 0.45,
    tipRatio: 0.09,
    archPeak: 0.39,
  },
  index: {
    bedLengthMm: 20.32,
    bedWidthMm: 10.78,
    bedCDepthMm: 2.1,
    bedArchMm: 1.72,
    bedZMm: -0.74,
    cuticleBlunt: 0.53,
    distalExponent: 1.92,
    taperStart: 0.46,
    tipRatio: 0.09,
    archPeak: 0.39,
  },
  middle: {
    bedLengthMm: 21.32,
    bedWidthMm: 11.38,
    bedCDepthMm: 2.18,
    bedArchMm: 1.8,
    bedZMm: -0.73,
    cuticleBlunt: 0.53,
    distalExponent: 1.9,
    taperStart: 0.46,
    tipRatio: 0.09,
    archPeak: 0.39,
  },
  ring: {
    bedLengthMm: 19.82,
    bedWidthMm: 10.38,
    bedCDepthMm: 2.06,
    bedArchMm: 1.72,
    bedZMm: -0.74,
    cuticleBlunt: 0.53,
    distalExponent: 1.92,
    taperStart: 0.47,
    tipRatio: 0.09,
    archPeak: 0.39,
  },
  pinky: {
    bedLengthMm: 16.35,
    bedWidthMm: 8.22,
    bedCDepthMm: 1.84,
    bedArchMm: 1.4,
    bedZMm: -0.7,
    cuticleBlunt: 0.54,
    distalExponent: 1.88,
    taperStart: 0.45,
    tipRatio: 0.09,
    archPeak: 0.38,
  },
};

export function innerSurfaceSpec(finger: FingerName, side: Chirality): InnerSurfaceSpec {
  return {
    kind: INNER_SURFACE_KIND,
    finger,
    side,
    ...INNER_BED_PRESETS[finger],
  };
}

/** 床面半宽。不调用 almondHalfWidth。 */
export function bedHalfWidth(s: number, spec: InnerSurfaceSpec): number {
  const maxHalf = spec.bedWidthMm / 2;
  const u = clamp01(s);
  const cuticle = spec.cuticleBlunt + (1 - spec.cuticleBlunt) * smoothstep(0, 0.11, u);
  let distal = 1;
  if (u > spec.taperStart) {
    const t = (u - spec.taperStart) / (1 - spec.taperStart);
    const n = spec.distalExponent;
    const raw = Math.pow(Math.max(0, 1 - Math.pow(t, n)), 1 / n);
    distal = spec.tipRatio + (1 - spec.tipRatio) * raw;
  }
  return maxHalf * cuticle * distal;
}

/** 右手规范坐标下的床面网格。左手由调用方镜像。 */
export function sampleInnerGrid(spec: InnerSurfaceSpec, nu: number, nv: number): Float32Array {
  const positions = new Float32Array(nu * nv * 3);
  let p = 0;
  for (let i = 0; i < nu; i++) {
    const s = i / (nu - 1);
    const halfW = bedHalfWidth(s, spec);
    const y = s * spec.bedLengthMm;
    const arch = longitudinalArch(s, spec.bedArchMm, spec.archPeak);
    const cDepth = localCDepth(halfW, spec.bedWidthMm, spec.bedCDepthMm);
    for (let j = 0; j < nv; j++) {
      const v = (j / (nv - 1)) * 2 - 1;
      const x = v * halfW;
      const z = spec.bedZMm + arch + cCurveZ(x, halfW, cDepth);
      positions[p++] = x;
      positions[p++] = y;
      positions[p++] = z;
    }
  }
  return positions;
}
