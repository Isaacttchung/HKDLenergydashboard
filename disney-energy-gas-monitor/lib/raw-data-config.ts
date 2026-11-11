import path from "path";
import {
  EXPECTED_RAW_LOGICAL_IDS,
  type RawLogicalId,
} from "@/lib/expected-raw-logical-ids";

export { EXPECTED_RAW_LOGICAL_IDS, type RawLogicalId };

export const RAW_DATA_DIR = path.join(process.cwd(), "data", "raw");

/** Alias for upload validation (Oscar Nov 2026). */
export const REQUIRED_RAW_LOGICAL_IDS = EXPECTED_RAW_LOGICAL_IDS;

const RAW_LOGICAL_ID_SET = new Set<string>(EXPECTED_RAW_LOGICAL_IDS);

/** Strip `_YYYYMMDDHHMMSS_<hash>.csv` and normalize to logical id key. */
export function normalizeRawFilenameKey(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, "").replace(/\.csv$/i, "");
  const withoutTimestamp = base.replace(
    /_\d{14}_[a-f0-9]{4}$/i,
    "",
  );
  return withoutTimestamp
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
}

export function resolveRawLogicalId(
  uploadedFilename: string,
): RawLogicalId | null {
  const key = normalizeRawFilenameKey(uploadedFilename);
  if (RAW_LOGICAL_ID_SET.has(key)) {
    return key as RawLogicalId;
  }
  return null;
}

export function isRawCsvFilename(filename: string): boolean {
  return filename.toLowerCase().endsWith(".csv");
}

/** UI label for a logical raw upload id (Top_10 import sources are EMS `.csv` files). */
export function rawLogicalIdDisplayFilename(logicalId: string): string {
  return `${logicalId}.csv`;
}

/** Monthly HCCP gas meter capacity export (separate from the 26 EMS CSV batch). */
export const HCCP_GAS_CAPACITY_LOGICAL_ID = "HCCP_Gas_Capacity";

export function isHccpGasCapacityCsvFilename(filename: string): boolean {
  if (!isRawCsvFilename(filename)) return false;
  return normalizeRawFilenameKey(filename) === HCCP_GAS_CAPACITY_LOGICAL_ID;
}
