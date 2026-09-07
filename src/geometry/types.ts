import type { Chirality, FingerName, PlateParams } from "../contracts/pnge";

export type { Chirality, FingerName, PlateParams };

export interface MeshData {
  name: string;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

export interface ShellGeometry {
  outer_form: MeshData;
  inner_fit: MeshData;
  edge_band: MeshData;
}

export interface SurfaceGrid {
  nu: number;
  nv: number;
  /** 行优先：i 沿长度（甲沟→尖端），j 沿宽度（-1…+1）。 */
  positions: Float32Array;
}

export interface BuildOptions {
  nu?: number;
  nv?: number;
  /** 外壳相对甲面再加厚，仅用于穿戴甲壳预览。 */
  wrapMm?: number;
}

export const DEFAULT_RES = { nu: 56, nv: 28 } as const;
