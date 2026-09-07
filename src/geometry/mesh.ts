import type { MeshData } from "./types";

export function gridIndex(i: number, j: number, nv: number): number {
  return i * nv + j;
}

export function makeGridIndices(nu: number, nv: number, flip = false): Uint32Array {
  const indices = new Uint32Array((nu - 1) * (nv - 1) * 6);
  let w = 0;
  for (let i = 0; i < nu - 1; i++) {
    for (let j = 0; j < nv - 1; j++) {
      const a = gridIndex(i, j, nv);
      const b = gridIndex(i, j + 1, nv);
      const c = gridIndex(i + 1, j, nv);
      const d = gridIndex(i + 1, j + 1, nv);
      if (!flip) {
        // a→b = +X，a→c = +Y，叉积 +Z（甲面朝上）
        indices[w++] = a;
        indices[w++] = b;
        indices[w++] = c;
        indices[w++] = b;
        indices[w++] = d;
        indices[w++] = c;
      } else {
        indices[w++] = a;
        indices[w++] = c;
        indices[w++] = b;
        indices[w++] = b;
        indices[w++] = c;
        indices[w++] = d;
      }
    }
  }
  return indices;
}

export function computeVertexNormals(positions: Float32Array, indices: Uint32Array): Float32Array {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i]! * 3;
    const ib = indices[i + 1]! * 3;
    const ic = indices[i + 2]! * 3;
    const ax = positions[ia]!;
    const ay = positions[ia + 1]!;
    const az = positions[ia + 2]!;
    const bx = positions[ib]!;
    const by = positions[ib + 1]!;
    const bz = positions[ib + 2]!;
    const cx = positions[ic]!;
    const cy = positions[ic + 1]!;
    const cz = positions[ic + 2]!;
    const ux = bx - ax;
    const uy = by - ay;
    const uz = bz - az;
    const vx = cx - ax;
    const vy = cy - ay;
    const vz = cz - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    normals[ia]! += nx;
    normals[ia + 1]! += ny;
    normals[ia + 2]! += nz;
    normals[ib]! += nx;
    normals[ib + 1]! += ny;
    normals[ib + 2]! += nz;
    normals[ic]! += nx;
    normals[ic + 1]! += ny;
    normals[ic + 2]! += nz;
  }
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i]!, normals[i + 1]!, normals[i + 2]!) || 1;
    normals[i]! /= len;
    normals[i + 1]! /= len;
    normals[i + 2]! /= len;
  }
  return normals;
}

export function offsetAlongNormals(
  positions: Float32Array,
  normals: Float32Array,
  distance: number,
): Float32Array {
  const out = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    out[i] = positions[i]! + normals[i]! * distance;
    out[i + 1] = positions[i + 1]! + normals[i + 1]! * distance;
    out[i + 2] = positions[i + 2]! + normals[i + 2]! * distance;
  }
  return out;
}

export function namedMesh(name: string, positions: Float32Array, indices: Uint32Array): MeshData {
  return {
    name,
    positions,
    indices,
    normals: computeVertexNormals(positions, indices),
  };
}

/** 沿网格边界走一圈（俯视逆时针）：甲沟 → 右侧 → 尖端 → 左侧。 */
export function outlineVertexIds(nu: number, nv: number): number[] {
  const ids: number[] = [];
  for (let j = 0; j < nv; j++) ids.push(gridIndex(0, j, nv));
  for (let i = 1; i < nu; i++) ids.push(gridIndex(i, nv - 1, nv));
  for (let j = nv - 2; j >= 0; j--) ids.push(gridIndex(nu - 1, j, nv));
  for (let i = nu - 2; i > 0; i--) ids.push(gridIndex(i, 0, nv));
  return ids;
}

export function buildEdgeBand(
  outerPos: Float32Array,
  innerPos: Float32Array,
  nu: number,
  nv: number,
): MeshData {
  const ring = outlineVertexIds(nu, nv);
  const n = ring.length;
  const positions = new Float32Array(n * 2 * 3);
  for (let k = 0; k < n; k++) {
    const src = ring[k]! * 3;
    const o = k * 3;
    const i = (n + k) * 3;
    positions[o] = outerPos[src]!;
    positions[o + 1] = outerPos[src + 1]!;
    positions[o + 2] = outerPos[src + 2]!;
    positions[i] = innerPos[src]!;
    positions[i + 1] = innerPos[src + 1]!;
    positions[i + 2] = innerPos[src + 2]!;
  }
  const indices = new Uint32Array(n * 6);
  let w = 0;
  for (let k = 0; k < n; k++) {
    const k1 = (k + 1) % n;
    const o0 = k;
    const o1 = k1;
    const i0 = n + k;
    const i1 = n + k1;
    indices[w++] = o0;
    indices[w++] = i0;
    indices[w++] = o1;
    indices[w++] = o1;
    indices[w++] = i0;
    indices[w++] = i1;
  }
  return namedMesh("edge_band", positions, indices);
}

export function mirrorX(positions: Float32Array): Float32Array {
  const out = new Float32Array(positions);
  for (let i = 0; i < out.length; i += 3) out[i] = -out[i]!;
  return out;
}

export function flipWinding(indices: Uint32Array): Uint32Array {
  const out = new Uint32Array(indices);
  for (let i = 0; i < out.length; i += 3) {
    const b = out[i + 1]!;
    out[i + 1] = out[i + 2]!;
    out[i + 2] = b;
  }
  return out;
}
