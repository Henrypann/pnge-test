import type { PlateParams } from "../contracts/pnge";
import { almondHalfWidth, cCurveZ, localCDepth, longitudinalArch } from "./almond";
import {
  buildEdgeBand,
  computeVertexNormals,
  flipWinding,
  makeGridIndices,
  mirrorX,
  namedMesh,
  offsetAlongNormals,
} from "./mesh";
import { DEFAULT_RES, type BuildOptions, type MeshData, type ShellGeometry } from "./types";

function buildOuterGrid(params: PlateParams, nu: number, nv: number): Float32Array {
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
      const z = arch + cCurveZ(v * halfW, halfW, cDepth);
      positions[p++] = x;
      positions[p++] = y;
      positions[p++] = z;
    }
  }
  return positions;
}

function rebuildMesh(name: string, positions: Float32Array, indices: Uint32Array): MeshData {
  return namedMesh(name, positions, indices);
}

/**
 * 穿戴甲壳：outer_form（外轮廓）、inner_fit（贴合面）、edge_band（真实厚度侧壁）。
 * wrapMm 在甲面厚度之外再向外加一层，仅供预览。
 */
export function buildWearableShell(params: PlateParams, options: BuildOptions = {}): ShellGeometry {
  const nu = options.nu ?? DEFAULT_RES.nu;
  const nv = options.nv ?? DEFAULT_RES.nv;
  const wrapMm = options.wrapMm ?? 0;

  const outerPos = buildOuterGrid(params, nu, nv);
  const outerIdx = makeGridIndices(nu, nv, false);
  const outerN = computeVertexNormals(outerPos, outerIdx);

  const thickness = params.sidewallMm + wrapMm;
  const innerPos = offsetAlongNormals(outerPos, outerN, -thickness);
  const innerIdx = makeGridIndices(nu, nv, true);

  const shell: ShellGeometry = {
    outer_form: rebuildMesh("outer_form", outerPos, outerIdx),
    inner_fit: rebuildMesh("inner_fit", innerPos, innerIdx),
    edge_band: buildEdgeBand(outerPos, innerPos, nu, nv),
  };
  return params.side === "L" ? mirrorShellToLeft(shell) : shell;
}

/** 甲面：与甲壳同拓扑，无额外 wrap。 */
export function buildNailPlate(params: PlateParams, options: BuildOptions = {}): ShellGeometry {
  return buildWearableShell(params, { ...options, wrapMm: 0 });
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
