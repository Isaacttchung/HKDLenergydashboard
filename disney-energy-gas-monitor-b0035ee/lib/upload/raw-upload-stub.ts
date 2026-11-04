import { access, mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { clearDataStoreCache } from "@/lib/datastore/master-sheet-store";
import {
  EXPECTED_RAW_LOGICAL_IDS,
  RAW_DATA_DIR,
  resolveRawLogicalId,
} from "@/lib/raw-data-config";
import { MASTER_SHEETS_DIR } from "@/lib/master-sheets-config";
import {
  validateRawCsvBatch,
  type RawCsvWarning,
} from "@/lib/raw-csv-validation";
import { RAW_CONVERSION_FEED_IN_MASTER } from "@/lib/upload/batch-classifier";
import {
  convertPowerSolarMaster,
  POWER_SOLAR_MASTER_FILENAME,
} from "@/lib/raw-to-master/power-solar";
import {
  convertTop10Master,
  TOP10_MASTER_FILENAME,
  Top10ConversionError,
} from "@/lib/raw-to-master/top-10";
import { buildDownloadableAfterWarnings } from "@/lib/upload/downloadable-after-warnings";
import { validateRawBatchDateConsistency } from "@/lib/upload/raw-conversion-guards";
import { resolveExpectedMasterSheetFilename } from "@/lib/master-sheets-config";
import type { DownloadableAfterWarning } from "@/lib/upload/downloadable-after-warnings";

const MAX_BYTES = 40 * 1024 * 1024;

function sanitizeCsvFilename(raw: string): string | null {
  const base = path.basename(raw);
  if (!base || base !== raw.replace(/^.*[/\\]/, "")) return null;
  if (base.includes("..")) return null;
  if (!base.toLowerCase().endsWith(".csv")) return null;
  return base;
}

function sanitizeMasterFilename(raw: string): string | null {
  const base = path.basename(raw);
  if (!base || base !== raw.replace(/^.*[/\\]/, "")) return null;
  if (base.includes("..")) return null;
  const lower = base.toLowerCase();
  if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) return null;
  return base;
}

export interface RawUploadStubResult {
  ok: true;
  saved: string[];
  warnings: RawCsvWarning[];
  logicalIds: string[];
  downloadableAfterWarnings: DownloadableAfterWarning[];
  message: string;
}

export interface RawUploadStubError {
  ok: false;
  status: number;
  body: Record<string, unknown>;
}

export type RawUploadStubOutcome = RawUploadStubResult | RawUploadStubError;

/**
 * Mode A: stage 26 CSVs + feed-in, validate, Top_10 + Power_Solar conversion, refresh cache.
 */
export async function handleRawConversionUpload(
  files: File[],
  options: { replaceExisting?: boolean } = {},
): Promise<RawUploadStubOutcome> {
  const saved: string[] = [];
  const skipped: Array<{ name: string; reason: string }> = [];
  const byLogicalId = new Map<
    string,
    { filename: string; content: string }
  >();
  let feedInFile: { safeName: string; buffer: Buffer } | null = null;

  for (const entry of files) {
    const csvName = sanitizeCsvFilename(entry.name);
    if (csvName) {
      const logicalId = resolveRawLogicalId(csvName);
      if (!logicalId) {
        skipped.push({
          name: csvName,
          reason: "Not recognized as one of the 26 HKDL raw CSV logical ids",
        });
        continue;
      }
      if (entry.size > MAX_BYTES) {
        skipped.push({ name: csvName, reason: "File too large (max 40 MB)" });
        continue;
      }
      const content = Buffer.from(await entry.arrayBuffer()).toString("utf-8");
      byLogicalId.set(logicalId, { filename: csvName, content });
      saved.push(`${csvName} → ${logicalId}`);
      continue;
    }

    const masterName = sanitizeMasterFilename(entry.name);
    if (masterName) {
      const canonical = resolveExpectedMasterSheetFilename(masterName);
      if (canonical !== RAW_CONVERSION_FEED_IN_MASTER) {
        skipped.push({
          name: masterName,
          reason: "Only HKDL Daily Feed-in Tariff Report may accompany raw CSVs",
        });
        continue;
      }
      if (entry.size > MAX_BYTES) {
        skipped.push({ name: masterName, reason: "File too large (max 40 MB)" });
        continue;
      }
      feedInFile = {
        safeName: masterName,
        buffer: Buffer.from(await entry.arrayBuffer()),
      };
      saved.push(
        masterName === canonical
          ? canonical
          : `${masterName} → ${canonical}`,
      );
      continue;
    }

    skipped.push({ name: entry.name, reason: "Invalid filename" });
  }

  if (skipped.length > 0) {
    return {
      ok: false,
      status: 400,
      body: { error: "Could not process raw conversion batch", skipped },
    };
  }

  if (!feedInFile) {
    return {
      ok: false,
      status: 400,
      body: {
        error:
          "Missing HKDL Daily Feed-in Tariff Report.xlsx (required with 26 raw CSVs)",
      },
    };
  }

  const uploadedIds = [...byLogicalId.keys()];
  const missing = EXPECTED_RAW_LOGICAL_IDS.filter(
    (id) => !byLogicalId.has(id),
  );

  if (missing.length > 0) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "Incomplete raw batch (26 CSV files required)",
        missing,
        uploaded: uploadedIds,
        requiredCount: EXPECTED_RAW_LOGICAL_IDS.length,
      },
    };
  }

  await mkdir(RAW_DATA_DIR, { recursive: true });
  await mkdir(MASTER_SHEETS_DIR, { recursive: true });

  for (const [, { filename, content }] of byLogicalId) {
    await writeFile(path.join(RAW_DATA_DIR, filename), content, "utf-8");
  }

  await writeFile(
    path.join(MASTER_SHEETS_DIR, RAW_CONVERSION_FEED_IN_MASTER),
    feedInFile.buffer,
  );

  const csvContents = [...byLogicalId.entries()].map(([logicalId, { content }]) => ({
    logicalId,
    content,
  }));
  const rawCsvByLogicalId: Record<string, string> = {};
  for (const { logicalId, content } of csvContents) {
    rawCsvByLogicalId[logicalId] = content;
  }

  const dateCheck = validateRawBatchDateConsistency(rawCsvByLogicalId);
  if (!dateCheck.ok) {
    return {
      ok: false,
      status: 400,
      body: {
        error: dateCheck.error,
        dateMismatch: dateCheck.details,
      },
    };
  }
  const dataDate = dateCheck.dataDate;

  const powerSolarPath = path.join(MASTER_SHEETS_DIR, POWER_SOLAR_MASTER_FILENAME);
  const top10Path = path.join(MASTER_SHEETS_DIR, TOP10_MASTER_FILENAME);
  const feedInPath = path.join(MASTER_SHEETS_DIR, RAW_CONVERSION_FEED_IN_MASTER);
  for (const [label, p] of [
    [POWER_SOLAR_MASTER_FILENAME, powerSolarPath],
    [TOP10_MASTER_FILENAME, top10Path],
  ] as const) {
    try {
      await access(p);
    } catch {
      return {
        ok: false,
        status: 400,
        body: {
          error: `Missing ${label} on host (required for raw conversion)`,
        },
      };
    }
  }

  try {
    await convertTop10Master({
      dataDate,
      rawCsvByLogicalId,
      masterWorkbookPath: top10Path,
      feedInTariffPath: feedInPath,
      replaceExisting: options.replaceExisting ?? false,
    });
  } catch (error) {
    if (error instanceof Top10ConversionError) {
      return {
        ok: false,
        status: 400,
        body: {
          error: error.message,
          code: error.code,
          ...(error.code === "MISSING_WEBSS_ROW" ||
          error.code === "FEED_IN_DATE" ||
          error.code === "DUPLICATE_DATE"
            ? { offerMasterDownload: true }
            : {}),
        },
      };
    }
    const message =
      error instanceof Error ? error.message : "Top_10 conversion failed";
    return { ok: false, status: 400, body: { error: message } };
  }

  try {
    await convertPowerSolarMaster({
      dataDate,
      rawCsvByLogicalId,
      masterWorkbookPath: powerSolarPath,
      feedInTariffPath: feedInPath,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Power_Solar conversion failed";
    return {
      ok: false,
      status: 400,
      body: { error: message },
    };
  }

  const warnings = validateRawCsvBatch(
    csvContents.map(({ logicalId, content }) => ({
      filename: logicalId,
      content,
    })),
  );

  clearDataStoreCache();
  revalidatePath("/");

  const downloadableAfterWarnings =
    warnings.length > 0
      ? buildDownloadableAfterWarnings(warnings, { includeMasters: true })
      : [];

  return {
    ok: true,
    saved,
    warnings,
    logicalIds: uploadedIds,
    downloadableAfterWarnings,
    message:
      warnings.length > 0
        ? `Processed 27-file batch for ${dataDate} (${warnings.length} validation warning(s)). Top_10 and Power_Solar masters updated.`
        : `Processed 27-file batch for ${dataDate} with no validation warnings. Top_10 and Power_Solar masters updated.`,
  };
}

/** @deprecated Use handleRawConversionUpload */
export const handleRawCsvUploadStub = handleRawConversionUpload;
