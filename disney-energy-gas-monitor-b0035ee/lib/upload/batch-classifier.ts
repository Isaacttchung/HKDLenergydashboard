import {
  EXPECTED_RAW_LOGICAL_IDS,
  isRawCsvFilename,
  resolveRawLogicalId,
} from "@/lib/raw-data-config";
import {
  EXPECTED_MASTER_SHEET_FILES,
  type ExpectedMasterSheetFile,
  resolveExpectedMasterSheetFilename,
} from "@/lib/master-sheets-config";

export const RAW_CONVERSION_FEED_IN_MASTER: ExpectedMasterSheetFile =
  "HKDL_Daily_Feed-in_Tariff_Report.xlsx";

export type UploadBatchKind = "raw_conversion" | "master_replace";

export interface UploadBatchClassification {
  kind: UploadBatchKind;
}

export interface UploadBatchRejection {
  kind: "invalid";
  error: string;
  missing?: string[];
  uploaded?: string[];
  requiredCount?: number;
  extraMasters?: string[];
}

export type UploadBatchOutcome = UploadBatchClassification | UploadBatchRejection;

function classifyFiles(filenames: string[]): {
  rawLogicalIds: Set<string>;
  masterCanonical: Set<ExpectedMasterSheetFile>;
  unrecognized: string[];
} {
  const rawLogicalIds = new Set<string>();
  const masterCanonical = new Set<ExpectedMasterSheetFile>();
  const unrecognized: string[] = [];

  for (const name of filenames) {
    if (isRawCsvFilename(name)) {
      const id = resolveRawLogicalId(name);
      if (!id) {
        unrecognized.push(name);
        continue;
      }
      rawLogicalIds.add(id);
      continue;
    }

    const lower = name.toLowerCase();
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      const canonical = resolveExpectedMasterSheetFilename(name);
      if (!canonical) {
        unrecognized.push(name);
        continue;
      }
      masterCanonical.add(canonical);
      continue;
    }

    unrecognized.push(name);
  }

  return { rawLogicalIds, masterCanonical, unrecognized };
}

/**
 * Oscar Nov 2026: success only for (a) 26 raw logical ids + feed-in master in one POST (27 files),
 * or (b) all four canonical masters. Everything else is blocking.
 */
export function classifyUploadBatch(filenames: string[]): UploadBatchOutcome {
  if (filenames.length === 0) {
    return {
      kind: "invalid",
      error: "No files provided",
    };
  }

  const { rawLogicalIds, masterCanonical, unrecognized } =
    classifyFiles(filenames);

  if (unrecognized.length > 0) {
    return {
      kind: "invalid",
      error:
        "Unrecognized file(s) in batch. Upload either all four master workbooks or 26 raw CSVs plus HKDL Daily Feed-in Tariff Report.",
    };
  }

  const rawCount = rawLogicalIds.size;
  const hasFeedIn = masterCanonical.has(RAW_CONVERSION_FEED_IN_MASTER);
  const otherMasters = [...masterCanonical].filter(
    (m) => m !== RAW_CONVERSION_FEED_IN_MASTER,
  );

  const missingRaw = EXPECTED_RAW_LOGICAL_IDS.filter(
    (id) => !rawLogicalIds.has(id),
  );

  const missingMasters = EXPECTED_MASTER_SHEET_FILES.filter(
    (m) => !masterCanonical.has(m),
  );

  if (rawCount === 0 && missingMasters.length === 0) {
    if (filenames.length !== EXPECTED_MASTER_SHEET_FILES.length) {
      return {
        kind: "invalid",
        error: `Master replace requires exactly ${EXPECTED_MASTER_SHEET_FILES.length} workbooks, received ${filenames.length}.`,
      };
    }
    return { kind: "master_replace" };
  }

  if (rawCount > 0 || masterCanonical.size > 0) {
    if (otherMasters.length > 0 && rawCount > 0) {
      return {
        kind: "invalid",
        error:
          "Mixed batch: raw CSVs cannot be uploaded together with master workbooks other than HKDL Daily Feed-in Tariff Report.",
        extraMasters: otherMasters,
      };
    }

    if (rawCount > 0) {
      if (!hasFeedIn) {
        return {
          kind: "invalid",
          error:
            "Raw conversion requires HKDL Daily Feed-in Tariff Report.xlsx in the same upload as all 26 raw CSV files.",
          missing: ["HKDL Daily Feed-in Tariff Report.xlsx"],
          uploaded: [...rawLogicalIds],
          requiredCount: EXPECTED_RAW_LOGICAL_IDS.length,
        };
      }

      if (missingRaw.length > 0) {
        return {
          kind: "invalid",
          error: "Incomplete raw batch (26 CSV files required with feed-in report)",
          missing: missingRaw,
          uploaded: [...rawLogicalIds],
          requiredCount: EXPECTED_RAW_LOGICAL_IDS.length,
        };
      }

      if (rawCount === EXPECTED_RAW_LOGICAL_IDS.length && hasFeedIn) {
        const expectedFiles = EXPECTED_RAW_LOGICAL_IDS.length + 1;
        if (filenames.length !== expectedFiles) {
          return {
            kind: "invalid",
            error: `Raw conversion requires exactly ${expectedFiles} files (26 CSVs + HKDL Daily Feed-in Tariff Report), received ${filenames.length}.`,
          };
        }
        return { kind: "raw_conversion" };
      }
    }

    if (hasFeedIn && rawCount === 0 && masterCanonical.size === 1) {
      return {
        kind: "invalid",
        error:
          "HKDL Daily Feed-in Tariff Report alone is not enough — include all 26 raw CSV files in the same upload.",
        missing: [...EXPECTED_RAW_LOGICAL_IDS],
        requiredCount: EXPECTED_RAW_LOGICAL_IDS.length,
      };
    }
  }

  if (masterCanonical.size > 0 && rawCount === 0 && missingMasters.length > 0) {
    return {
      kind: "invalid",
      error: "Incomplete master batch (all four canonical workbooks required)",
      missing: missingMasters,
      uploaded: [...masterCanonical],
      requiredCount: EXPECTED_MASTER_SHEET_FILES.length,
    };
  }

  return {
    kind: "invalid",
    error:
      "Upload either all four master Excel workbooks or 26 raw CSVs plus HKDL Daily Feed-in Tariff Report (one batch, no mixing).",
  };
}
