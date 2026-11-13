import {
  EXPECTED_RAW_LOGICAL_IDS,
  isHccpGasCapacityCsvFilename,
  isRawCsvFilename,
  normalizeRawFilenameKey,
  resolveRawLogicalId,
} from "@/lib/raw-data-config";
import { isMobileGasolineDieselUploadFilename } from "@/lib/mobile-fuels/gasoline-diesel-filename";
import { isMonthlyUtilitiesConsumptionFilename } from "@/lib/monthly-utilities-gas/utilities-consumption-filename";
import {
  EXPECTED_MASTER_SHEET_FILES,
  type ExpectedMasterSheetFile,
  resolveExpectedMasterSheetFilename,
} from "@/lib/master-sheets-config";

export const RAW_CONVERSION_FEED_IN_MASTER: ExpectedMasterSheetFile =
  "HKDL_Daily_Feed-in_Tariff_Report.xlsx";

export const RAW_CONVERSION_HCCP_GAS_CAPACITY_CSV = "HCCP Gas Capacity.csv";

/** 26 EMS CSVs + HCCP Gas Capacity + feed-in master. */
export const RAW_CONVERSION_TOTAL_FILES =
  EXPECTED_RAW_LOGICAL_IDS.length + 2;

export type UploadBatchKind =
  | "raw_conversion"
  | "master_replace"
  | "mobile_fuels";

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
  unrecognized?: string[];
  ignoredOptional?: string[];
}

export type UploadBatchOutcome = UploadBatchClassification | UploadBatchRejection;

/** EMS sometimes bundles this optional meter file — do not count toward the 28-file batch. */
const OPTIONAL_RAW_UPLOAD_KEYS = new Set(["CCP_COP_kWh"]);

export function sanitizeUploadFilename(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, "").trim();
  return base.replace(/\s+\(\d+\)(?=\.[^.]+$)/i, "");
}

export function isIgnoredUploadFilename(filename: string): boolean {
  const base = sanitizeUploadFilename(filename);
  const lower = base.toLowerCase();
  if (
    lower === "thumbs.db" ||
    lower === "desktop.ini" ||
    lower === ".ds_store"
  ) {
    return true;
  }
  if (isRawCsvFilename(base)) {
    const key = normalizeRawFilenameKey(base);
    if (key && OPTIONAL_RAW_UPLOAD_KEYS.has(key)) return true;
  }
  return false;
}

function classifyFiles(filenames: string[]): {
  rawLogicalIds: Set<string>;
  hccpGasCapacityCsvCount: number;
  masterCanonical: Set<ExpectedMasterSheetFile>;
  mobileGasolineDieselCount: number;
  mobileUtilitiesConsumptionCount: number;
  unrecognized: string[];
} {
  const rawLogicalIds = new Set<string>();
  let hccpGasCapacityCsvCount = 0;
  const masterCanonical = new Set<ExpectedMasterSheetFile>();
  let mobileGasolineDieselCount = 0;
  let mobileUtilitiesConsumptionCount = 0;
  const unrecognized: string[] = [];

  for (const name of filenames) {
    const safeName = sanitizeUploadFilename(name);
    if (isMobileGasolineDieselUploadFilename(safeName)) {
      mobileGasolineDieselCount += 1;
      continue;
    }
    if (isMonthlyUtilitiesConsumptionFilename(safeName)) {
      mobileUtilitiesConsumptionCount += 1;
      continue;
    }
    if (isRawCsvFilename(safeName)) {
      if (isHccpGasCapacityCsvFilename(safeName)) {
        hccpGasCapacityCsvCount += 1;
        continue;
      }
      const id = resolveRawLogicalId(safeName);
      if (!id) {
        unrecognized.push(name);
        continue;
      }
      rawLogicalIds.add(id);
      continue;
    }

    const lower = safeName.toLowerCase();
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      const canonical = resolveExpectedMasterSheetFilename(safeName);
      if (!canonical) {
        unrecognized.push(name);
        continue;
      }
      masterCanonical.add(canonical);
      continue;
    }

    unrecognized.push(name);
  }

  return {
    rawLogicalIds,
    hccpGasCapacityCsvCount,
    masterCanonical,
    mobileGasolineDieselCount,
    mobileUtilitiesConsumptionCount,
    unrecognized,
  };
}

/**
 * Success only for (a) 26 EMS CSVs + HCCP Gas Capacity + feed-in (28 files),
 * or (b) all four canonical masters.
 */
export function classifyUploadBatch(filenames: string[]): UploadBatchOutcome {
  if (filenames.length === 0) {
    return {
      kind: "invalid",
      error: "No files provided",
    };
  }

  const ignoredOptional = filenames.filter((name) =>
    isIgnoredUploadFilename(name),
  );
  const effectiveFilenames = filenames.filter(
    (name) => !isIgnoredUploadFilename(name),
  );
  if (effectiveFilenames.length === 0) {
    return {
      kind: "invalid",
      error: "No recognized upload files after removing optional extras.",
      ignoredOptional,
    };
  }

  const {
    rawLogicalIds,
    hccpGasCapacityCsvCount,
    masterCanonical,
    mobileGasolineDieselCount,
    mobileUtilitiesConsumptionCount,
    unrecognized,
  } = classifyFiles(effectiveFilenames);

  if (unrecognized.length > 0) {
    return {
      kind: "invalid",
      error:
        "Unrecognized file(s) in batch. Mode A needs 26 EMS CSVs, HCCP Gas Capacity.csv, and HKDL Daily Feed-in Tariff Report (28 files). Mode B needs all four master workbooks.",
      unrecognized,
      ignoredOptional: ignoredOptional.length ? ignoredOptional : undefined,
    };
  }

  const rawCount = rawLogicalIds.size;
  const hasFeedIn = masterCanonical.has(RAW_CONVERSION_FEED_IN_MASTER);
  const otherMasters = [...masterCanonical].filter(
    (m) => m !== RAW_CONVERSION_FEED_IN_MASTER,
  );

  const mobileModeCCount =
    mobileGasolineDieselCount + mobileUtilitiesConsumptionCount;

  if (mobileModeCCount > 0) {
    if (rawCount > 0 || hccpGasCapacityCsvCount > 0 || masterCanonical.size > 0) {
      return {
        kind: "invalid",
        error:
          "Mixed batch: Mode C mobile fuel workbooks cannot be uploaded with Mode A raw CSVs or Mode B master sheets.",
      };
    }
    if (mobileGasolineDieselCount > 1) {
      return {
        kind: "invalid",
        error:
          "Mode C expects at most one gasoline/diesel workbook per upload.",
      };
    }
    if (mobileUtilitiesConsumptionCount > 1) {
      return {
        kind: "invalid",
        error:
          "Mode C expects at most one Monthly Utilities Consumption workbook per upload.",
      };
    }
    if (effectiveFilenames.length !== mobileModeCCount) {
      return {
        kind: "invalid",
        error:
          "Unrecognized file(s) in Mode C batch. Use only recognized Mode C workbooks.",
      };
    }
    return { kind: "mobile_fuels" };
  }

  const missingRaw = EXPECTED_RAW_LOGICAL_IDS.filter(
    (id) => !rawLogicalIds.has(id),
  );

  const missingMasters = EXPECTED_MASTER_SHEET_FILES.filter(
    (m) => !masterCanonical.has(m),
  );

  if (rawCount === 0 && missingMasters.length === 0) {
    if (effectiveFilenames.length !== EXPECTED_MASTER_SHEET_FILES.length) {
      return {
        kind: "invalid",
        error: `Master replace requires exactly ${EXPECTED_MASTER_SHEET_FILES.length} workbooks, received ${effectiveFilenames.length}.`,
      };
    }
    return { kind: "master_replace" };
  }

  if (rawCount > 0 || masterCanonical.size > 0 || hccpGasCapacityCsvCount > 0) {
    if (otherMasters.length > 0 && (rawCount > 0 || hccpGasCapacityCsvCount > 0)) {
      return {
        kind: "invalid",
        error:
          "Mixed batch: raw CSVs cannot be uploaded together with master workbooks other than HKDL Daily Feed-in Tariff Report.",
        extraMasters: otherMasters,
      };
    }

    if (rawCount > 0 || hccpGasCapacityCsvCount > 0) {
      if (!hasFeedIn) {
        return {
          kind: "invalid",
          error:
            "Raw conversion requires HKDL Daily Feed-in Tariff Report.xlsx in the same upload as all EMS CSVs and HCCP Gas Capacity.csv.",
          missing: ["HKDL Daily Feed-in Tariff Report.xlsx"],
          uploaded: [...rawLogicalIds],
          requiredCount: EXPECTED_RAW_LOGICAL_IDS.length,
        };
      }

      if (hccpGasCapacityCsvCount !== 1) {
        return {
          kind: "invalid",
          error:
            hccpGasCapacityCsvCount === 0
              ? "Raw conversion requires HCCP Gas Capacity.csv with the 26 EMS CSV files."
              : "Raw conversion expects exactly one HCCP Gas Capacity.csv per upload.",
        };
      }

      if (missingRaw.length > 0) {
        return {
          kind: "invalid",
          error: "Incomplete raw batch (26 EMS CSV files required with feed-in report)",
          missing: missingRaw,
          uploaded: [...rawLogicalIds],
          requiredCount: EXPECTED_RAW_LOGICAL_IDS.length,
        };
      }

      if (rawCount === EXPECTED_RAW_LOGICAL_IDS.length && hasFeedIn) {
        if (effectiveFilenames.length !== RAW_CONVERSION_TOTAL_FILES) {
          return {
            kind: "invalid",
            error: `Raw conversion requires exactly ${RAW_CONVERSION_TOTAL_FILES} files (26 EMS CSVs + HCCP Gas Capacity + HKDL Daily Feed-in Tariff Report), received ${effectiveFilenames.length}.`,
            ignoredOptional: ignoredOptional.length ? ignoredOptional : undefined,
          };
        }
        return { kind: "raw_conversion" };
      }
    }

    if (hasFeedIn && rawCount === 0 && hccpGasCapacityCsvCount === 0 && masterCanonical.size === 1) {
      return {
        kind: "invalid",
        error:
          "HKDL Daily Feed-in Tariff Report alone is not enough — include all 26 EMS raw CSV files and HCCP Gas Capacity.csv in the same upload.",
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
      "Upload either all four master Excel workbooks, or 26 EMS CSVs plus HCCP Gas Capacity.csv and HKDL Daily Feed-in Tariff Report (one batch, no mixing).",
  };
}
