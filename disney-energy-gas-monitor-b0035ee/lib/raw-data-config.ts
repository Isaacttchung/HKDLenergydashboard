import path from "path";

export const RAW_DATA_DIR = path.join(process.cwd(), "data", "raw");

/** Required raw CSV logical ids (26 per batch; `CCP_COP_kWh` unused). */
export const EXPECTED_RAW_LOGICAL_IDS = [
  "CCP+HCCP_Daily1",
  "Mercury_CCP",
  "Mercury_HCCP",
  "Mercury_Hotel",
  "Mercury_Park",
  "SS200_TxA_1",
  "SS201_TxA_1",
  "SS201_TxB_1",
  "SS201_TxC_1",
  "SS202_TxA_1",
  "SS202_TxB_1",
  "SS203_TxA_1",
  "SS203_TxB_1",
  "SS203_TxC_1",
  "SS204_TxA_1",
  "SS204_TxB_1",
  "SS206_TxA_1",
  "SS206_TxB_1",
  "SS207_TxA",
  "SS207_TxB",
  "SS208_TxA_HV",
  "SS210_TxA_1",
  "SS211_TxA_1",
  "SS221_HV",
  "209-121-126",
  "209-MeterB",
] as const;

/** Alias for upload validation (Oscar Nov 2026). */
export const REQUIRED_RAW_LOGICAL_IDS = EXPECTED_RAW_LOGICAL_IDS;

export type RawLogicalId = (typeof EXPECTED_RAW_LOGICAL_IDS)[number];

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
