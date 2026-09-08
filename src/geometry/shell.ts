import { OUTER_FORM_KIND, type PlateParams } from "../contracts/pnge";
import { almondHalfWidth, cCurveZ, localCDepth, longitudinalArch } from "./almond";
import { innerSurfaceSpec, sampleInnerGrid } from "./innerSurface";
import {
  buildEdgeBand,
  flipWinding,
  makeGridIndices,
  mirrorX,
  namedMesh,
} from "./mesh";
import {
  DEFAULT_RES,
  type BuildOptions,
  type MeshData,
  type OuterFormSpec,
  type ShellBuild,
  type ShellGeometry,
} from "./types";

export function outerFormSpec(params: PlateParams, wrapMm: number): OuterFormSpec {
  return {
    kind: OUTER_FORM_KIND,
    lengthMm: params.lengthMm,
    widthMm: params.widthMm,
    cDepthMm: params.cDepthMm,
    archMm: params.archMm,
    wrapMm,
    shape: params.shape,
  };
}

function buildOuterGrid(params: PlateParams, nu: number, nv: number, wrapMm: number): Float32Array {
  const positions = new Float32Array(nu * nv * 3);
  let p = 0;
  for (let i = 0; i < nu; i++) {
    const s = i / (nu - 1);
    const halfW = almondHalfWidth(s, params.widthMm);
    const y = s * params.lengthMm;
    const arch = longitudinalArch(s, params.archMm);
    const cDepth = localCDepth(halfW, params.widthMm, params.cDepthMm);
    for (let j = 0; j < nv; j++) {
      const v = (j / (nv - 1)) * 2 - 1;
      const x = v * halfW;
      const z = arch + cCurveZ(v * halfW, halfW, cDepth) + wrapMm;
      positions[p++] = x;
      positions[p++] = y;
      positions[p++] = z;
    }
  }
  return positions;
}

/**
 * 穿戴甲壳：outer_form（外轮廓）、inner_fit（独立床面）、edge_band（侧壁）。
 * wrapMm 只加在外表面 +Z，供预览加厚；床面仍由 InnerSurfaceSpec 单独采样。
 */
export function buildWearableShellDetailed(
  params: PlateParams,
  options: BuildOptions = {},
): ShellBuild {
  const nu = options.nu ?? DEFAULT_RES.nu;
  const nv = options.nv ?? DEFAULT_RES.nv;
  const wrapMm = options.wrapMm ?? 0;
  const inner = options.inner ?? innerSurfaceSpec(params.finger, params.side);
  const outer = outerFormSpec(params, wrapMm);

  const outerPos = buildOuterGrid(params, nu, nv, wrapMm);
  const outerIdx = makeGridIndices(nu, nv, false);
  const innerPos = sampleInnerGrid(inner, nu, nv);
  const innerIdx = makeGridIndices(nu, nv, true);

  let shell: ShellGeometry = {
    outer_form: namedMesh("outer_form", outerPos, outerIdx),
    inner_fit: namedMesh("inner_fit", innerPos, innerIdx),
    edge_band: buildEdgeBand(outerPos, innerPos, nu, nv),
  };
  if (params.side === "L") shell = mirrorShellToLeft(shell);

  return { shell, outer, inner, params, nu, nv, wrapMm };
}

export function buildNailPlateDetailed(params: PlateParams, options: BuildOptions = {}): ShellBuild {
  return buildWearableShellDetailed(params, { ...options, wrapMm: 0 });
}

export function buildWearableShell(params: PlateParams, options: BuildOptions = {}): ShellGeometry {
  return buildWearableShellDetailed(params, options).shell;
}

/** 甲面：与甲壳同拓扑，无额外 wrap。 */
export function buildNailPlate(params: PlateParams, options: BuildOptions = {}): ShellGeometry {
  return buildNailPlateDetailed(params, options).shell;
}

export function shellMeshes(shell: ShellGeometry): MeshData[] {
  return [shell.outer_form, shell.inner_fit, shell.edge_band];
}

/** 左手网格也可由右手镜像得到（测试用）。 */
export function mirrorShellToLeft(shell: ShellGeometry): ShellGeometry {
  const map = (mesh: MeshData, name: MeshData["name"]): MeshData => {
    const positions = mirrorX(mesh.positions);
    const indices = flipWinding(mesh.indices);
    return namedMesh(name, positions, indices);
  };
  return {
    outer_form: map(shell.outer_form, "outer_form"),
    inner_fit: map(shell.inner_fit, "inner_fit"),
    edge_band: map(shell.edge_band, "edge_band"),
  };
}
