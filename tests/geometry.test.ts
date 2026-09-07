import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SHELL_MESH_NAMES } from "../src/contracts/pnge";
import { listGlbMeshNames } from "../src/export/glb";
import { FINGER_ORDER, FINGER_PRESETS, plateParams } from "../src/geometry/fingers";
import { measureAlmondPlan, measureShell } from "../src/geometry/measure";
import { buildNailPlate, buildWearableShell } from "../src/geometry/shell";

describe("soft almond plate", () => {
  it("tapers toward the tip", () => {
    const plan = measureAlmondPlan(FINGER_PRESETS.middle.widthMm);
    expect(plan.tipHalf).toBeLessThan(plan.maxHalf * 0.25);
    expect(plan.cuticleHalf).toBeLessThan(plan.maxHalf);
  });

  it("keeps a rounded (non-zero) tip", () => {
    const plan = measureAlmondPlan(FINGER_PRESETS.middle.widthMm);
    expect(plan.tipHalf).toBeGreaterThan(0.4);
  });
});

describe("middle finger ballpark", () => {
  const shell = buildNailPlate(plateParams("middle", "R"));
  const m = measureShell(shell);

  it("C depth ~ 2.4 mm", () => {
    expect(m.cDepthMm).toBeGreaterThan(2.1);
    expect(m.cDepthMm).toBeLessThan(2.7);
  });

  it("longitudinal arch ~ 2 mm", () => {
    expect(m.archMm).toBeGreaterThan(1.7);
    expect(m.archMm).toBeLessThan(2.3);
  });

  it("sidewall ~ 0.8 mm", () => {
    expect(m.sidewallMm).toBeGreaterThan(0.65);
    expect(m.sidewallMm).toBeLessThan(0.95);
  });
});

describe("wearable shell", () => {
  it("exports named meshes outer_form, inner_fit, edge_band", () => {
    const shell = buildWearableShell(plateParams("middle", "R"));
    expect(shell.outer_form.name).toBe("outer_form");
    expect(shell.inner_fit.name).toBe("inner_fit");
    expect(shell.edge_band.name).toBe("edge_band");
    expect([...SHELL_MESH_NAMES]).toEqual(["outer_form", "inner_fit", "edge_band"]);
  });

  it("inner_fit sits below outer_form at the apex", () => {
    const shell = buildNailPlate(plateParams("middle", "R"));
    let zOuter = -Infinity;
    let zInner = -Infinity;
    const o = shell.outer_form.positions;
    const inn = shell.inner_fit.positions;
    for (let i = 2; i < o.length; i += 3) {
      zOuter = Math.max(zOuter, o[i]!);
      zInner = Math.max(zInner, inn[i]!);
    }
    expect(zInner).toBeLessThan(zOuter - 0.4);
  });

  it("L/R plates are X mirrors", () => {
    const r = buildNailPlate(plateParams("index", "R")).outer_form.positions;
    const l = buildNailPlate(plateParams("index", "L")).outer_form.positions;
    expect(l.length).toBe(r.length);
    for (let i = 0; i < r.length; i += 3) {
      expect(l[i]!).toBeCloseTo(-r[i]!, 5);
      expect(l[i + 1]!).toBeCloseTo(r[i + 1]!, 5);
      expect(l[i + 2]!).toBeCloseTo(r[i + 2]!, 5);
    }
  });

  it("builds finite meshes for 5 fingers × L/R", () => {
    for (const finger of FINGER_ORDER) {
      for (const side of ["L", "R"] as const) {
        const shell = buildNailPlate(plateParams(finger, side));
        for (const mesh of [shell.outer_form, shell.inner_fit, shell.edge_band]) {
          expect(mesh.positions.length).toBeGreaterThan(30);
          expect(mesh.indices.length).toBeGreaterThan(30);
          for (let i = 0; i < mesh.positions.length; i++) {
            expect(Number.isFinite(mesh.positions[i])).toBe(true);
          }
        }
      }
    }
  });
});

describe("sample glb", () => {
  it("public/samples/plate_middle_R.glb contains the three shell parts", () => {
    const bytes = readFileSync(join(process.cwd(), "public/samples/plate_middle_R.glb"));
    const names = listGlbMeshNames(bytes);
    expect(names).toEqual(expect.arrayContaining([...SHELL_MESH_NAMES]));
  });
});
