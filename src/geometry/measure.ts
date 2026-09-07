import { almondHalfWidth } from "./almond";
import { gridIndex, outlineVertexIds } from "./mesh";
import type { ShellGeometry } from "./types";

export interface PlateMeasurement {
  cDepthMm: number;
  archMm: number;
  sidewallMm: number;
  maxWidthMm: number;
  tipWidthMm: number;
  cuticleWidthMm: number;
  lengthMm: number;
}

function vertex(positions: Float32Array, id: number): [number, number, number] {
  const o = id * 3;
  return [positions[o]!, positions[o + 1]!, positions[o + 2]!];
}

function gridSize(mesh: ShellGeometry["outer_form"]): { nu: number; nv: number } {
  const count = mesh.positions.length / 3;
  const y0 = mesh.positions[1]!;
  let nv = 1;
  for (let i = 1; i < count; i++) {
    if (Math.abs(mesh.positions[i * 3 + 1]! - y0) > 1e-9) break;
    nv++;
  }
  return { nv, nu: count / nv };
}

/**
 * C 深：最宽截面上，外表面中线 z 减两侧壁 z 均值。
 * 纵拱：两侧壁中线相对甲沟–尖端弦的最大矢高。
 * 侧壁：边界对应点 outer→inner 的平均欧氏距离（真实厚度）。
 */
export function measureShell(shell: ShellGeometry): PlateMeasurement {
  const outer = shell.outer_form.positions;
  const inner = shell.inner_fit.positions;
  const { nu, nv } = gridSize(shell.outer_form);
  const midJ = Math.floor((nv - 1) / 2);

  let maxWidth = 0;
  let maxI = 0;
  for (let i = 0; i < nu; i++) {
    const left = vertex(outer, gridIndex(i, 0, nv));
    const right = vertex(outer, gridIndex(i, nv - 1, nv));
    const w = Math.hypot(right[0] - left[0], right[1] - left[1], right[2] - left[2]);
    if (w > maxWidth) {
      maxWidth = w;
      maxI = i;
    }
  }

  const cLeft = vertex(outer, gridIndex(maxI, 0, nv));
  const cRight = vertex(outer, gridIndex(maxI, nv - 1, nv));
  const cMid = vertex(outer, gridIndex(maxI, midJ, nv));
  const edgeZ = 0.5 * (cLeft[2] + cRight[2]);
  const cDepthMm = cMid[2] - edgeZ;

  const e0L = vertex(outer, gridIndex(0, 0, nv));
  const e1L = vertex(outer, gridIndex(nu - 1, 0, nv));
  const e0R = vertex(outer, gridIndex(0, nv - 1, nv));
  const e1R = vertex(outer, gridIndex(nu - 1, nv - 1, nv));
  let archMm = 0;
  for (let i = 0; i < nu; i++) {
    const t = i / (nu - 1);
    const l = vertex(outer, gridIndex(i, 0, nv));
    const r = vertex(outer, gridIndex(i, nv - 1, nv));
    const chordL = e0L[2] + (e1L[2] - e0L[2]) * t;
    const chordR = e0R[2] + (e1R[2] - e0R[2]) * t;
    archMm = Math.max(archMm, l[2] - chordL, r[2] - chordR);
  }

  const ring = outlineVertexIds(nu, nv);
  let sidewall = 0;
  for (const id of ring) {
    const o = vertex(outer, id);
    const inn = vertex(inner, id);
    sidewall += Math.hypot(o[0] - inn[0], o[1] - inn[1], o[2] - inn[2]);
  }
  sidewall /= ring.length;

  const cuticleL = vertex(outer, gridIndex(0, 0, nv));
  const cuticleR = vertex(outer, gridIndex(0, nv - 1, nv));
  const tipL = vertex(outer, gridIndex(nu - 1, 0, nv));
  const tipR = vertex(outer, gridIndex(nu - 1, nv - 1, nv));
  const root = vertex(outer, gridIndex(0, midJ, nv));
  const tip = vertex(outer, gridIndex(nu - 1, midJ, nv));

  return {
    cDepthMm,
    archMm,
    sidewallMm: sidewall,
    maxWidthMm: maxWidth,
    tipWidthMm: Math.hypot(tipR[0] - tipL[0], tipR[1] - tipL[1]),
    cuticleWidthMm: Math.hypot(cuticleR[0] - cuticleL[0], cuticleR[1] - cuticleL[1]),
    lengthMm: Math.hypot(tip[0] - root[0], tip[1] - root[1], tip[2] - root[2]),
  };
}

export function measureAlmondPlan(widthMm: number): {
  maxHalf: number;
  tipHalf: number;
  cuticleHalf: number;
} {
  const samples = 80;
  let maxHalf = 0;
  for (let i = 0; i < samples; i++) {
    maxHalf = Math.max(maxHalf, almondHalfWidth(i / (samples - 1), widthMm));
  }
  return {
    maxHalf,
    tipHalf: almondHalfWidth(1, widthMm),
    cuticleHalf: almondHalfWidth(0, widthMm),
  };
}
