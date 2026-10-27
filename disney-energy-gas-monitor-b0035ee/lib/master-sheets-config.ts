import path from "path";

export const MASTER_SHEETS_DIR = path.join(
  process.cwd(),
  "data",
  "master-sheets",
);

/** Filenames the dashboard is built to read (replace-in-place on upload). */
export const EXPECTED_MASTER_SHEET_FILES = [
  "HCCP_Gas_Consumption_report.xlsx",
  "HKDL_Daily_Feed-in_Tariff_Report.xlsx",
  "HKDL_Power_Solar_consumption_report.xlsx",
  "HKDL_Top_10.xlsx",
] as const;

export type ExpectedMasterSheetFile = (typeof EXPECTED_MASTER_SHEET_FILES)[number];

export function isExpectedMasterSheetFilename(
  filename: string,
): filename is ExpectedMasterSheetFile {
  return (EXPECTED_MASTER_SHEET_FILES as readonly string[]).includes(filename);
}

/** Loose match key so uploads with spaces / mixed case still map to canonical names. */
export function normalizeMasterSheetFilenameKey(filename: string): string {
  const withoutExt = filename.replace(/\.(xlsx|xls)$/i, "").trim();
  return withoutExt
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
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

export function getUploadTokenFromEnv(): string | undefined {
  const token = process.env.MASTER_SHEET_UPLOAD_TOKEN?.trim();
  return token || undefined;
}
