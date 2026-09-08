import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_TOLERANCE_BANDS,
  PRINT_READY,
  TOLERANCE_BAND_VERSION,
  createEmptyDocument,
  exportManufacturingBundle,
} from "../src/contracts/pnge";
import { readGlbJson, readGlbPngeHeader, writeGlb } from "../src/export/glb";
import { fingerprintAll, fingerprintEdgeBand, fingerprintFit, fingerprintShape } from "../src/geometry/fingerprint";
import { plateParams } from "../src/geometry/fingers";
import { buildObjectHeader } from "../src/geometry/header";
import { innerSurfaceSpec } from "../src/geometry/innerSurface";
import { measureInnerDeviation } from "../src/geometry/measure";
import { offsetAlongNormals } from "../src/geometry/mesh";
import { sha256Hex } from "../src/geometry/sha256";
import {
  buildNailPlate,
  buildNailPlateDetailed,
  buildWearableShellDetailed,
  shellMeshes,
} from "../src/geometry/shell";

/** 中指右手甲面三通道黄金指纹（E5）。改算法或预设时必须显式更新。 */
export const GOLDEN_MIDDLE_R = {
  fit: "28b06667fd4abd10c0dce7dd34d9e7394b620cb418da88fd43546acf5bc3ca92",
  shape: "3f143cb757012a6f7e1bb3cc211a6fc44a919444b835a607d89a1a96d9718b76",
  edgeBand: "78d49f60c5ba84647401a21e9c90237fa5a79c09d2f3293b64740d00b8c521d1",
};

function maxVertexDelta(a: Float32Array, b: Float32Array): number {
  let max = 0;
  for (let i = 0; i < a.length; i += 3) {
    max = Math.max(
      max,
      Math.hypot(a[i]! - b[i]!, a[i + 1]! - b[i + 1]!, a[i + 2]! - b[i + 2]!),
    );
  }
  return max;
}

describe("sha256", () => {
  it("matches FIPS empty string and node:crypto", () => {
    const empty = sha256Hex("");
    expect(empty).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    const abc = sha256Hex("abc");
    expect(abc).toBe(createHash("sha256").update("abc").digest("hex"));
    expect(abc).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("E1 Fit fingerprint", () => {
  it("same InnerSurfaceSpec + sampling yields identical fit hash", () => {
    const params = plateParams("middle", "R");
    const a = fingerprintFit(buildNailPlateDetailed(params));
    const b = fingerprintFit(buildNailPlateDetailed(params));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(b);
  });
});

describe("E2 Shape fingerprint", () => {
  it("same PlateParams + wrap yields identical shape hash", () => {
    const params = plateParams("ring", "R");
    const a = fingerprintShape(buildWearableShellDetailed(params, { wrapMm: 0.18 }));
    const b = fingerprintShape(buildWearableShellDetailed(params, { wrapMm: 0.18 }));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(b);
  });
});

describe("E3 EdgeBand fingerprint", () => {
  it("same Fit+Shape pair yields identical edge_band hash", () => {
    const params = plateParams("index", "L");
    const a = fingerprintEdgeBand(buildNailPlateDetailed(params));
    const b = fingerprintEdgeBand(buildNailPlateDetailed(params));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(b);
  });
});

describe("E4 channel isolation", () => {
  it("changing inner spec changes Fit (and EdgeBand), not Shape", () => {
    const params = plateParams("middle", "R");
    const base = buildNailPlateDetailed(params);
    const inner = innerSurfaceSpec("middle", "R");
    const mutated = buildNailPlateDetailed(params, {
      inner: { ...inner, bedCDepthMm: inner.bedCDepthMm + 0.4 },
    });
    expect(fingerprintFit(mutated)).not.toBe(fingerprintFit(base));
    expect(fingerprintEdgeBand(mutated)).not.toBe(fingerprintEdgeBand(base));
    expect(fingerprintShape(mutated)).toBe(fingerprintShape(base));
  });

  it("changing outer cDepth changes Shape (and EdgeBand), not Fit", () => {
    const params = plateParams("middle", "R");
    const base = buildNailPlateDetailed(params);
    const mutated = buildNailPlateDetailed({ ...params, cDepthMm: params.cDepthMm + 0.4 });
    expect(fingerprintShape(mutated)).not.toBe(fingerprintShape(base));
    expect(fingerprintEdgeBand(mutated)).not.toBe(fingerprintEdgeBand(base));
    expect(fingerprintFit(mutated)).toBe(fingerprintFit(base));
  });

  it("wrapMm lifts Shape, not Fit", () => {
    const params = plateParams("middle", "R");
    const plate = buildNailPlateDetailed(params);
    const shell = buildWearableShellDetailed(params, { wrapMm: 0.18 });
    expect(fingerprintFit(shell)).toBe(fingerprintFit(plate));
    expect(fingerprintShape(shell)).not.toBe(fingerprintShape(plate));
    expect(fingerprintEdgeBand(shell)).not.toBe(fingerprintEdgeBand(plate));
  });
});

describe("E5 independence + header + golden", () => {
  it("shell and innerSurface sources do not call normal-offset helpers", () => {
    const shellSrc = readFileSync(join(process.cwd(), "src/geometry/shell.ts"), "utf8");
    const innerSrc = readFileSync(join(process.cwd(), "src/geometry/innerSurface.ts"), "utf8");
    expect(shellSrc).not.toMatch(/offsetAlongNormals\s*\(/);
    expect(innerSrc).not.toMatch(/offsetAlongNormals/);
  });

  it("inner_fit is not a normal-offset of outer_form", () => {
    const params = plateParams("middle", "R");
    const shell = buildNailPlate(params);
    const offset = offsetAlongNormals(
      shell.outer_form.positions,
      shell.outer_form.normals,
      -params.sidewallMm,
    );
    expect(maxVertexDelta(shell.inner_fit.positions, offset)).toBeGreaterThan(0.2);
  });

  it("inner_fit matches independent spec resample", () => {
    const right = buildNailPlateDetailed(plateParams("middle", "R"));
    const left = buildNailPlateDetailed(plateParams("middle", "L"));
    expect(measureInnerDeviation(right)).toBeLessThan(1e-9);
    expect(measureInnerDeviation(left)).toBeLessThan(1e-9);
  });

  it("three rebuilds lock middle_R golden hashes", () => {
    const params = plateParams("middle", "R");
    const hashes = [0, 1, 2].map(() => fingerprintAll(buildNailPlateDetailed(params)));
    expect(hashes[1]).toEqual(hashes[0]);
    expect(hashes[2]).toEqual(hashes[0]);
    expect(hashes[0]!.fit).toBe(GOLDEN_MIDDLE_R.fit);
    expect(hashes[0]!.shape).toBe(GOLDEN_MIDDLE_R.shape);
    expect(hashes[0]!.edgeBand).toBe(GOLDEN_MIDDLE_R.edgeBand);
  });

  it("GLB extras carry versioned tolerance band and fingerprints", () => {
    const build = buildNailPlateDetailed(plateParams("pinky", "R"));
    const header = buildObjectHeader(build);
    const bytes = writeGlb(shellMeshes(build.shell), { header });
    const read = readGlbPngeHeader(bytes);
    expect(read?.schema).toBe("pnge.objectHeader");
    expect(read?.printReady).toBe(false);
    expect(read?.toleranceBands.version).toBe(TOLERANCE_BAND_VERSION);
    expect(read?.toleranceBands).toEqual(DEFAULT_TOLERANCE_BANDS);
    expect(read?.fingerprints.fit).toBe(header.fingerprints.fit);
    expect(read?.innerSurface.kind).toBe("parametric_bed_v1");
    const json = readGlbJson(bytes) as {
      meshes?: { name?: string; extras?: { channel?: string } }[];
    };
    const innerMesh = json.meshes?.find((m) => m.name === "inner_fit");
    expect(innerMesh?.extras?.channel).toBe("fit");
  });
});

describe("PRINT_READY remains false", () => {
  it("export still refuses and documents NOT print-ready", () => {
    expect(PRINT_READY).toBe(false);
    expect(() => exportManufacturingBundle(createEmptyDocument())).toThrow(
      /NOT print-ready|不可打印/,
    );
  });

  it("README and viewer do not claim wearable fit or print-ready", () => {
    const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");
    const viewer = readFileSync(join(process.cwd(), "src/viewer/createViewer.ts"), "utf8");
    expect(readme).not.toContain("可贴合");
    expect(viewer).not.toContain("可贴合");
    expect(readme).not.toMatch(/print-ready(?!.*false)/i);
  });
});
