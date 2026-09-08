/**
 * PNGE — Parametric Nail Geometry Exchange
 * （参数化甲面几何交换，草稿契约，非正式标准）
 *
 * 本文件只描述字段与网格命名，不构成可制造 / 可打印交付。
 *
 * Fit 法：inner_fit 必须来自独立的 InnerSurfaceSpec 参数化床面，
 * 禁止用外表面法向偏置生成内表面。
 */

export const PNGE_VERSION = "0.2.0-draft";

export const PNGE_UNITS = "mm" as const;

export type FingerName = "thumb" | "index" | "middle" | "ring" | "pinky";

export type Chirality = "L" | "R";

export type PlateShape = "soft_almond";

/** 穿戴甲壳必须使用的网格名（GLB node / mesh name）。 */
export const SHELL_MESH_NAMES = ["outer_form", "inner_fit", "edge_band"] as const;

export type ShellMeshName = (typeof SHELL_MESH_NAMES)[number];

export type FingerprintChannel = "fit" | "shape" | "edgeBand";

export const INNER_SURFACE_KIND = "parametric_bed_v1" as const;

export const OUTER_FORM_KIND = "soft_almond_outer_v1" as const;

export const TOLERANCE_BAND_VERSION = "pnge.toleranceBands.v1";

export const FINGERPRINT_ALGORITHM = "pnge.fingerprint.v1+sha256";

export const OBJECT_HEADER_SCHEMA = "pnge.objectHeader" as const;

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
  /** 侧壁 / 游离缘设计意图厚度，毫米。实测为 outer↔inner 边界距，不是法向偏置距离。 */
  sidewallMm: number;
  shape: PlateShape;
}

/**
 * 独立参数化床面（inner_fit）。
 * 字段全部是床面自己的参数，不引用 outer_form 顶点或法向。
 */
export interface InnerSurfaceSpec {
  kind: typeof INNER_SURFACE_KIND;
  finger: FingerName;
  side: Chirality;
  /** 床面长度（甲沟→游离缘），毫米。 */
  bedLengthMm: number;
  /** 床面最大宽度，毫米。 */
  bedWidthMm: number;
  /** 床面 C 曲深度，毫米。 */
  bedCDepthMm: number;
  /** 床面纵拱，毫米。 */
  bedArchMm: number;
  /** 床面整体 Z 平移（毫米）。这是显式高度，不是沿法向的距离。 */
  bedZMm: number;
  /** 甲沟端半宽相对最大半宽的比例（圆钝）。 */
  cuticleBlunt: number;
  /** 远端超椭圆指数。 */
  distalExponent: number;
  /** 开始收尖的归一化长度。 */
  taperStart: number;
  /** 尖端半宽相对中段的比例。 */
  tipRatio: number;
  /** 纵拱峰值位置（0–1）。 */
  archPeak: number;
}

/** 外轮廓参数（outer_form / Shape 通道）。与床面彼此独立。 */
export interface OuterFormSpec {
  kind: typeof OUTER_FORM_KIND;
  lengthMm: number;
  widthMm: number;
  cDepthMm: number;
  archMm: number;
  /** 仅预览：外表面整体 +Z。不进入 InnerSurfaceSpec。 */
  wrapMm: number;
  shape: PlateShape;
}

/**
 * 版本化公差带：量级核对窗口，不是临床贴合承诺。
 * 改 version 字符串即视为新策略，旧指纹不再与新带比较。
 */
export interface ToleranceBands {
  version: typeof TOLERANCE_BAND_VERSION;
  units: typeof PNGE_UNITS;
  cDepthMm: number;
  archMm: number;
  edgeThicknessMm: number;
  innerDeviationMm: number;
}

export const DEFAULT_TOLERANCE_BANDS: ToleranceBands = {
  version: TOLERANCE_BAND_VERSION,
  units: PNGE_UNITS,
  cDepthMm: 0.35,
  archMm: 0.35,
  edgeThicknessMm: 0.2,
  innerDeviationMm: 0.15,
};

export interface PngeFingerprints {
  algorithm: typeof FINGERPRINT_ALGORITHM;
  fit: string;
  shape: string;
  edgeBand: string;
}

/** 对象头：写入 GLB asset.extras.pnge。 */
export interface PngeObjectHeader {
  schema: typeof OBJECT_HEADER_SCHEMA;
  version: string;
  units: typeof PNGE_UNITS;
  printReady: false;
  toleranceBands: ToleranceBands;
  fingerprints: PngeFingerprints;
  outerForm: OuterFormSpec;
  innerSurface: InnerSurfaceSpec;
}

export interface PlateSpec {
  id: string;
  params: PlateParams;
  meshUri?: string;
}

export interface ShellSpec {
  id: string;
  params: PlateParams;
  /** 相对甲面的外壳加厚（仅预览，非公差带）。 */
  wrapMm: number;
  meshUri?: string;
  meshNames: typeof SHELL_MESH_NAMES;
  innerSurface?: InnerSurfaceSpec;
  toleranceBands?: ToleranceBands;
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
      "inner_fit 是独立参数化床面；网格名不是贴合承诺。",
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

export function channelForMeshName(name: string): FingerprintChannel | undefined {
  if (name === "inner_fit") return "fit";
  if (name === "outer_form") return "shape";
  if (name === "edge_band") return "edgeBand";
  return undefined;
}
