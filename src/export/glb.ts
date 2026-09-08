import {
  channelForMeshName,
  type PngeObjectHeader,
} from "../contracts/pnge";
import type { MeshData } from "../geometry/types";

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const FLOAT = 5126;
const UNSIGNED_INT = 5125;
const ARRAY_BUFFER = 34962;
const ELEMENT_ARRAY_BUFFER = 34963;

function pad4(n: number): number {
  return (4 - (n % 4)) % 4;
}

function alignView(offset: number): number {
  return offset + pad4(offset);
}

function bounds(arr: Float32Array, stride: number): { min: number[]; max: number[] } {
  const min = Array.from({ length: stride }, () => Infinity);
  const max = Array.from({ length: stride }, () => -Infinity);
  for (let i = 0; i < arr.length; i += stride) {
    for (let k = 0; k < stride; k++) {
      const v = arr[i + k]!;
      if (v < min[k]!) min[k] = v;
      if (v > max[k]!) max[k] = v;
    }
  }
  return { min, max };
}

export interface WriteGlbOptions {
  header?: PngeObjectHeader;
}

/** 将命名三角网格写成 glTF Binary（.glb），单位毫米。可选写入对象头 extras。 */
export function writeGlb(meshes: MeshData[], options: WriteGlbOptions = {}): Uint8Array {
  if (meshes.length === 0) throw new Error("writeGlb: no meshes");

  const binParts: Uint8Array[] = [];
  let binSize = 0;
  const bufferViews: {
    buffer: number;
    byteOffset: number;
    byteLength: number;
    target?: number;
  }[] = [];
  const accessors: Record<string, unknown>[] = [];
  const gltfMeshes: Record<string, unknown>[] = [];
  const nodes: Record<string, unknown>[] = [];

  const pushBuffer = (bytes: Uint8Array, target?: number): number => {
    binSize = alignView(binSize);
    const viewIndex = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: binSize, byteLength: bytes.byteLength, target });
    const padded = new Uint8Array(bytes.byteLength + pad4(bytes.byteLength));
    padded.set(bytes);
    binParts.push(padded);
    binSize += padded.byteLength;
    return viewIndex;
  };

  for (let m = 0; m < meshes.length; m++) {
    const mesh = meshes[m]!;
    const posBounds = bounds(mesh.positions, 3);
    const nrmBounds = bounds(mesh.normals, 3);

    const posView = pushBuffer(new Uint8Array(mesh.positions.buffer, mesh.positions.byteOffset, mesh.positions.byteLength), ARRAY_BUFFER);
    const nrmView = pushBuffer(new Uint8Array(mesh.normals.buffer, mesh.normals.byteOffset, mesh.normals.byteLength), ARRAY_BUFFER);
    const idxView = pushBuffer(new Uint8Array(mesh.indices.buffer, mesh.indices.byteOffset, mesh.indices.byteLength), ELEMENT_ARRAY_BUFFER);

    const posAcc = accessors.length;
    accessors.push({
      bufferView: posView,
      componentType: FLOAT,
      count: mesh.positions.length / 3,
      type: "VEC3",
      min: posBounds.min,
      max: posBounds.max,
    });
    const nrmAcc = accessors.length;
    accessors.push({
      bufferView: nrmView,
      componentType: FLOAT,
      count: mesh.normals.length / 3,
      type: "VEC3",
      min: nrmBounds.min,
      max: nrmBounds.max,
    });
    const idxAcc = accessors.length;
    accessors.push({
      bufferView: idxView,
      componentType: UNSIGNED_INT,
      count: mesh.indices.length,
      type: "SCALAR",
    });

    const channel = channelForMeshName(mesh.name);
    const meshExtras =
      options.header && channel
        ? {
            channel,
            fingerprint: options.header.fingerprints[channel],
            printReady: false as const,
            toleranceBandVersion: options.header.toleranceBands.version,
          }
        : undefined;
    gltfMeshes.push({
      name: mesh.name,
      primitives: [
        {
          attributes: { POSITION: posAcc, NORMAL: nrmAcc },
          indices: idxAcc,
        },
      ],
      ...(meshExtras ? { extras: meshExtras } : {}),
    });
    nodes.push({
      name: mesh.name,
      mesh: m,
      ...(meshExtras ? { extras: meshExtras } : {}),
    });
  }

  const json = {
    asset: {
      version: "2.0",
      generator: "pnge-test@0.2.0-draft",
      extras: options.header ? { pnge: options.header } : undefined,
    },
    extras: options.header ? { pnge: options.header } : undefined,
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes: gltfMeshes,
    accessors,
    bufferViews,
    buffers: [{ byteLength: binSize }],
  };

  const jsonText = JSON.stringify(json);
  const jsonBytesRaw = new TextEncoder().encode(jsonText);
  const jsonPad = pad4(jsonBytesRaw.byteLength);
  const jsonChunk = new Uint8Array(jsonBytesRaw.byteLength + jsonPad);
  jsonChunk.set(jsonBytesRaw);
  jsonChunk.fill(0x20, jsonBytesRaw.byteLength);

  const binChunk = new Uint8Array(binSize);
  let offset = 0;
  for (const part of binParts) {
    binChunk.set(part, offset);
    offset += part.byteLength;
  }
  const binPad = pad4(binChunk.byteLength);
  const binPadded = binPad ? new Uint8Array(binChunk.byteLength + binPad) : binChunk;
  if (binPad) binPadded.set(binChunk);

  const total = 12 + 8 + jsonChunk.byteLength + 8 + binPadded.byteLength;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, GLB_MAGIC, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonChunk.byteLength, true);
  view.setUint32(16, JSON_CHUNK, true);
  out.set(jsonChunk, 20);
  const binHeader = 20 + jsonChunk.byteLength;
  view.setUint32(binHeader, binPadded.byteLength, true);
  view.setUint32(binHeader + 4, BIN_CHUNK, true);
  out.set(binPadded, binHeader + 8);
  return out;
}

export function readGlbJson(glb: Uint8Array): Record<string, unknown> {
  if (glb.byteLength < 20) throw new Error("readGlbJson: too short");
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  if (view.getUint32(0, true) !== GLB_MAGIC) throw new Error("readGlbJson: not GLB");
  const jsonLength = view.getUint32(12, true);
  const jsonBytes = glb.subarray(20, 20 + jsonLength);
  return JSON.parse(new TextDecoder().decode(jsonBytes)) as Record<string, unknown>;
}

export function listGlbMeshNames(glb: Uint8Array): string[] {
  if (glb.byteLength < 20) return [];
  try {
    const json = readGlbJson(glb) as {
      meshes?: { name?: string }[];
      nodes?: { name?: string }[];
    };
    const names = (json.nodes ?? json.meshes ?? []).map((n) => n.name).filter((n): n is string => !!n);
    return names;
  } catch {
    return [];
  }
}

export function readGlbPngeHeader(glb: Uint8Array): PngeObjectHeader | undefined {
  const json = readGlbJson(glb);
  const extras = json.extras as { pnge?: PngeObjectHeader } | undefined;
  const asset = json.asset as { extras?: { pnge?: PngeObjectHeader } } | undefined;
  return extras?.pnge ?? asset?.extras?.pnge;
}
