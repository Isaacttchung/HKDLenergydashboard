import path from "path";
import {
  EXPECTED_MASTER_SHEET_FILES,
  type ExpectedMasterSheetFile,
} from "@/lib/expected-master-sheet-files";

export { EXPECTED_MASTER_SHEET_FILES, type ExpectedMasterSheetFile };

export const MASTER_SHEETS_DIR = path.join(
  process.cwd(),
  "data",
  "master-sheets",
);

export function isExpectedMasterSheetFilename(
  filename: string,
): filename is ExpectedMasterSheetFile {
  return (EXPECTED_MASTER_SHEET_FILES as readonly string[]).includes(filename);
}

/** Loose match key so uploads with spaces / mixed case still map to canonical names. */
export function normalizeMasterSheetFilenameKey(filename: string): string {
  let withoutExt = filename.replace(/^.*[/\\]/, "").replace(/\.(xlsx|xls)$/i, "").trim();
  withoutExt = withoutExt.replace(/\s+\(\d+\)$/i, "");
  let key = withoutExt
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
  if (key.startsWith("hkdl_daily_feed-in_tariff_report_")) {
    key = "hkdl_daily_feed-in_tariff_report";
  }
  return key;
}

/**
 * Map an uploaded filename to the canonical master sheet name on disk.
 * Accepts e.g. "HKDL Daily Feed-in Tariff Report.xlsx" → HKDL_Daily_Feed-in_Tariff_Report.xlsx
 */
export function resolveExpectedMasterSheetFilename(
  uploadedFilename: string,
): ExpectedMasterSheetFile | null {
  const base = path.basename(uploadedFilename);
  if (isExpectedMasterSheetFilename(base)) {
    return base;
  }

  const uploadedKey = normalizeMasterSheetFilenameKey(base);
  for (const expected of EXPECTED_MASTER_SHEET_FILES) {
    if (normalizeMasterSheetFilenameKey(expected) === uploadedKey) {
      return expected;
    }
  }

  return null;
}

/** Upload / Edit Excels gate password (override with env `MASTER_SHEET_UPLOAD_TOKEN` if set). */
export const MASTER_SHEET_UPLOAD_PASSWORD = "12345";

export function getUploadTokenFromEnv(): string {
  const fromEnv = process.env.MASTER_SHEET_UPLOAD_TOKEN?.trim();
  return fromEnv || MASTER_SHEET_UPLOAD_PASSWORD;
}
