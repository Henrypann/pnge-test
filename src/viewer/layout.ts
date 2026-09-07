import type { Chirality, FingerName } from "../contracts/pnge";
import { FINGER_ORDER } from "../geometry/fingers";

export interface NailPose {
  finger: FingerName;
  side: Chirality;
  x: number;
  y: number;
  yaw: number;
}

/** 每只手数位相对掌心的摆放（毫米）。拇指外展。 */
const FINGER_POSE: Record<FingerName, { x: number; y: number; yaw: number }> = {
  thumb: { x: 24, y: -16, yaw: 0.58 },
  index: { x: 11, y: 2, yaw: 0.08 },
  middle: { x: 0, y: 6, yaw: 0 },
  ring: { x: -11, y: 2, yaw: -0.07 },
  pinky: { x: -21, y: -10, yaw: -0.16 },
};

const HAND_X = 40;

export function tenNailTrayPoses(): NailPose[] {
  const poses: NailPose[] = [];
  for (const side of ["L", "R"] as const) {
    const sx = side === "L" ? -1 : 1;
    for (const finger of FINGER_ORDER) {
      const local = FINGER_POSE[finger];
      poses.push({
        finger,
        side,
        x: sx * HAND_X + sx * local.x,
        y: local.y,
        yaw: sx * local.yaw,
      });
    }
  }
  return poses;
}

export const TRAY = {
  width: 170,
  depth: 110,
  thickness: 4,
} as const;
