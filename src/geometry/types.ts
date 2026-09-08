import type {
  Chirality,
  FingerName,
  InnerSurfaceSpec,
  OuterFormSpec,
  PlateParams,
} from "../contracts/pnge";

export type { Chirality, FingerName, InnerSurfaceSpec, OuterFormSpec, PlateParams };

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
  /** 外壳相对甲面再加厚（仅 outer +Z 预览）。不进入床面参数。 */
  wrapMm?: number;
  /** 覆盖默认指位床面预设。 */
  inner?: InnerSurfaceSpec;
}

/** 带独立内外参数的完整构建，供指纹与对象头使用。 */
export interface ShellBuild {
  shell: ShellGeometry;
  outer: OuterFormSpec;
  inner: InnerSurfaceSpec;
  params: PlateParams;
  nu: number;
  nv: number;
  wrapMm: number;
}

export const DEFAULT_RES = { nu: 56, nv: 28 } as const;
