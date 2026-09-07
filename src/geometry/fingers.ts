import type { FingerName, PlateParams } from "../contracts/pnge";

const BASE = {
  shape: "soft_almond" as const,
};

/**
 * 成人长软杏仁穿戴甲大致尺寸（毫米）。
 * 中指：C 深 2.4、纵拱 2.0、侧壁 0.8。
 */
export const FINGER_PRESETS: Record<FingerName, Omit<PlateParams, "side">> = {
  thumb: {
    ...BASE,
    finger: "thumb",
    lengthMm: 19.0,
    widthMm: 13.0,
    cDepthMm: 2.55,
    archMm: 2.05,
    sidewallMm: 0.85,
  },
  index: {
    ...BASE,
    finger: "index",
    lengthMm: 20.5,
    widthMm: 11.0,
    cDepthMm: 2.3,
    archMm: 1.9,
    sidewallMm: 0.8,
  },
  middle: {
    ...BASE,
    finger: "middle",
    lengthMm: 21.5,
    widthMm: 11.6,
    cDepthMm: 2.4,
    archMm: 2.0,
    sidewallMm: 0.8,
  },
  ring: {
    ...BASE,
    finger: "ring",
    lengthMm: 20.0,
    widthMm: 10.6,
    cDepthMm: 2.25,
    archMm: 1.9,
    sidewallMm: 0.8,
  },
  pinky: {
    ...BASE,
    finger: "pinky",
    lengthMm: 16.5,
    widthMm: 8.4,
    cDepthMm: 2.0,
    archMm: 1.55,
    sidewallMm: 0.75,
  },
};

export const FINGER_ORDER: FingerName[] = ["thumb", "index", "middle", "ring", "pinky"];

export function plateParams(finger: FingerName, side: PlateParams["side"]): PlateParams {
  return { ...FINGER_PRESETS[finger], side };
}

export function sampleId(kind: "plate" | "shell", finger: FingerName, side: PlateParams["side"]): string {
  return `${kind}_${finger}_${side}`;
}
