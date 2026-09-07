/**
 * PNGE — Parametric Nail Geometry Exchange
 * （参数化甲面几何交换，草稿契约，非正式标准）
 *
 * 本文件只描述字段与网格命名，不构成可制造 / 可打印交付。
 */

export const PNGE_VERSION = "0.1.0-draft";

export const PNGE_UNITS = "mm" as const;

export type FingerName = "thumb" | "index" | "middle" | "ring" | "pinky";

export type Chirality = "L" | "R";

export type PlateShape = "soft_almond";

/** 穿戴甲壳必须使用的网格名（GLB node / mesh name）。 */
export const SHELL_MESH_NAMES = ["outer_form", "inner_fit", "edge_band"] as const;

export type ShellMeshName = (typeof SHELL_MESH_NAMES)[number];

export interface PlateParams {
  finger: FingerName;
  side: Chirality;
  /** 甲面长度：甲沟线（cuticle）到游离缘（tip），毫米。 */
  lengthMm: number;
  /** 甲面最大宽度，毫米。 */
  widthMm: number;
  /** C 曲深度（横向弧 sag），毫米。 */
  cDepthMm: number;
  /** 纵向拱高（甲沟到尖端弦上的最大矢高），毫米。 */
  archMm: number;
  /** 侧壁 / 游离缘真实厚度，毫米。 */
  sidewallMm: number;
  shape: PlateShape;
}

export interface PlateSpec {
  id: string;
  params: PlateParams;
  meshUri?: string;
}

export interface ShellSpec {
  id: string;
  params: PlateParams;
  /** 相对甲面的外壳加厚（仅预览，非贴合公差）。 */
  wrapMm: number;
  meshUri?: string;
  meshNames: typeof SHELL_MESH_NAMES;
}

export interface PngeDocument {
  schema: "pnge";
  version: string;
  units: typeof PNGE_UNITS;
  notes: string[];
  plates: PlateSpec[];
  shells: ShellSpec[];
}

export const PRINT_READY = false;

export function createEmptyDocument(): PngeDocument {
  return {
    schema: "pnge",
    version: PNGE_VERSION,
    units: PNGE_UNITS,
    notes: [
      "NOT print-ready / 不可用于 3D 打印或开模。",
      "Blender 婚甲渲染仅为造型灵感，不在本仓库复刻珠宝与花饰。",
    ],
    plates: [],
    shells: [],
  };
}

/** 制造导出桩：原型阶段故意失败，避免被当成可打印文件。 */
export function exportManufacturingBundle(_doc: PngeDocument): never {
  throw new Error(
    "PNGE 原型不可打印（NOT print-ready）。请勿将 GLB 用于 SLA/FDM 或开模。",
  );
}

export function isShellMeshName(name: string): name is ShellMeshName {
  return (SHELL_MESH_NAMES as readonly string[]).includes(name);
}
