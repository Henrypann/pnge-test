import { FINGERPRINT_ALGORITHM, type PngeFingerprints } from "../contracts/pnge";
import { sha256Hex } from "./sha256";
import type { ShellBuild } from "./types";

export const FINGERPRINT_SCHEMA = "pnge.fingerprint.v1" as const;

/**
 * 稳定指纹算法（pnge.fingerprint.v1+sha256）
 *
 * 每个通道一份载荷：
 *   { schema, channel, params, sampling: { nu, nv, vertexCount }, positionsUm[] }
 *
 *   fit      params = InnerSurfaceSpec，采样 inner_fit 顶点
 *   shape    params = OuterFormSpec，采样 outer_form 顶点
 *   edgeBand params = { inner, outer }，采样 edge_band 顶点
 *
 * 坐标先乘 1e6 再四舍五入到微米，避免 float32 噪声。
 * 规范化 JSON：对象键字典序；数字 -0→0 后 toFixed(6)；无空白。
 * 对该 UTF-8 字节做 SHA-256，输出 64 位小写十六进制。
 */

export function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("canonicalJson: non-finite number");
    const n = Object.is(value, -0) ? 0 : value;
    return n.toFixed(6);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const body = keys
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`)
      .join(",");
    return `{${body}}`;
  }
  throw new Error(`canonicalJson: unsupported ${typeof value}`);
}

export function positionsUm(positions: Float32Array): number[] {
  const out = new Array<number>(positions.length);
  for (let i = 0; i < positions.length; i++) out[i] = Math.round(positions[i]! * 1e6);
  return out;
}

function hashPayload(payload: unknown): string {
  return sha256Hex(canonicalJson(payload));
}

function sampling(nu: number, nv: number, positions: Float32Array) {
  return { nu, nv, vertexCount: positions.length / 3 };
}

export function fingerprintFit(build: ShellBuild): string {
  const positions = build.shell.inner_fit.positions;
  return hashPayload({
    schema: FINGERPRINT_SCHEMA,
    channel: "fit",
    params: build.inner,
    sampling: sampling(build.nu, build.nv, positions),
    positionsUm: positionsUm(positions),
  });
}

export function fingerprintShape(build: ShellBuild): string {
  const positions = build.shell.outer_form.positions;
  return hashPayload({
    schema: FINGERPRINT_SCHEMA,
    channel: "shape",
    params: build.outer,
    sampling: sampling(build.nu, build.nv, positions),
    positionsUm: positionsUm(positions),
  });
}

export function fingerprintEdgeBand(build: ShellBuild): string {
  const positions = build.shell.edge_band.positions;
  return hashPayload({
    schema: FINGERPRINT_SCHEMA,
    channel: "edgeBand",
    params: { inner: build.inner, outer: build.outer },
    sampling: sampling(build.nu, build.nv, positions),
    positionsUm: positionsUm(positions),
  });
}

export function fingerprintAll(build: ShellBuild): PngeFingerprints {
  return {
    algorithm: FINGERPRINT_ALGORITHM,
    fit: fingerprintFit(build),
    shape: fingerprintShape(build),
    edgeBand: fingerprintEdgeBand(build),
  };
}
