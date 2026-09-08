import {
  DEFAULT_TOLERANCE_BANDS,
  OBJECT_HEADER_SCHEMA,
  PNGE_UNITS,
  PNGE_VERSION,
  type PngeObjectHeader,
} from "../contracts/pnge";
import { fingerprintAll } from "./fingerprint";
import type { ShellBuild } from "./types";

export function buildObjectHeader(build: ShellBuild): PngeObjectHeader {
  return {
    schema: OBJECT_HEADER_SCHEMA,
    version: PNGE_VERSION,
    units: PNGE_UNITS,
    printReady: false,
    toleranceBands: DEFAULT_TOLERANCE_BANDS,
    fingerprints: fingerprintAll(build),
    outerForm: build.outer,
    innerSurface: build.inner,
  };
}
