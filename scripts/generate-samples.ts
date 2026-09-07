import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeGlb } from "../src/export/glb";
import { FINGER_ORDER, plateParams, sampleId } from "../src/geometry/fingers";
import { buildNailPlate, buildWearableShell, shellMeshes } from "../src/geometry/shell";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "samples");
mkdirSync(outDir, { recursive: true });

for (const finger of FINGER_ORDER) {
  for (const side of ["L", "R"] as const) {
    const params = plateParams(finger, side);
    const plate = buildNailPlate(params);
    const shell = buildWearableShell(params, { wrapMm: 0.18 });
    writeFileSync(join(outDir, `${sampleId("plate", finger, side)}.glb`), writeGlb(shellMeshes(plate)));
    writeFileSync(join(outDir, `${sampleId("shell", finger, side)}.glb`), writeGlb(shellMeshes(shell)));
  }
}

console.log(`wrote ${FINGER_ORDER.length * 4} glb files → public/samples (incl. plate_middle_R.glb)`);
