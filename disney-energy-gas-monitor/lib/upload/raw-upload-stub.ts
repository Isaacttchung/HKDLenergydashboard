import { access, mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { clearDataStoreCache } from "@/lib/datastore/master-sheet-store";
import {
  EXPECTED_RAW_LOGICAL_IDS,
  isHccpGasCapacityCsvFilename,
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
  convertHccpGasMaster,
  HCCP_GAS_MASTER_FILENAME,
  HccpGasConversionError,
} from "@/lib/raw-to-master/hccp-gas";
import { dailyReportDateFromEmsBatchDataDate } from "@/lib/hkdl-daily-report-date";
import { HCCP_GAS_CAPACITY_LOGICAL_ID } from "@/lib/raw-data-config";
import {
  saveMasterSnapshotForDate,
  saveRawSnapshotForDate,
} from "@/lib/upload/date-snapshot-store";
import { outdoorAirTempFromDaily1Csv } from "@/lib/raw-to-master/outdoor-air-temp";
import {
  loadHccpGasCapacityCsvTextsForConsumption,
  pruneHccpGasCapacityArchive,
  saveHccpGasCapacityUpload,
} from "@/lib/upload/hccp-gas-capacity-store";
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

export interface GasManualEntryPrompt {
  consumptionDate: string;
  required: true;
}

export interface RawUploadStubResult {
  ok: true;
  saved: string[];
  warnings: RawCsvWarning[];
  logicalIds: string[];
  downloadableAfterWarnings: DownloadableAfterWarning[];
  message: string;
  gasManualEntry?: GasManualEntryPrompt;
}

export interface RawUploadStubError {
  ok: false;
  status: number;
  body: Record<string, unknown>;
}

export type RawUploadStubOutcome = RawUploadStubResult | RawUploadStubError;

/**
 * Raw conversion: 26 EMS CSVs + HCCP Gas Capacity + feed-in → Top_10, Power_Solar, gas master.
 */
export interface RawConversionUploadOptions {
  replaceExisting?: boolean;
  skipGasConversion?: boolean;
  capacitySupplementTexts?: string[];
}

export async function handleRawConversionUpload(
  files: File[],
  options: RawConversionUploadOptions = {},
): Promise<RawUploadStubOutcome> {
  const saved: string[] = [];
  const skipped: Array<{ name: string; reason: string }> = [];
  const byLogicalId = new Map<
    string,
    { filename: string; content: string }
  >();
  let feedInFile: { safeName: string; buffer: Buffer } | null = null;
  let hccpGasCapacity: { filename: string; content: string } | null = null;

  for (const entry of files) {
    const csvName = sanitizeCsvFilename(entry.name);
    if (csvName) {
      if (isHccpGasCapacityCsvFilename(csvName)) {
        if (hccpGasCapacity) {
          skipped.push({
            name: csvName,
            reason: "Only one HCCP Gas Capacity.csv allowed per upload",
          });
          continue;
        }
        if (entry.size > MAX_BYTES) {
          skipped.push({ name: csvName, reason: "File too large (max 40 MB)" });
          continue;
        }
        const content = Buffer.from(await entry.arrayBuffer()).toString("utf-8");
        hccpGasCapacity = { filename: csvName, content };
        saved.push(csvName);
        continue;
      }
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

  if (!hccpGasCapacity) {
    return {
      ok: false,
      status: 400,
      body: { error: "Missing HCCP Gas Capacity.csv (required with 26 EMS CSVs)" },
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
  const emsBatchDataDate = dateCheck.dataDate;
  const reportDate = dailyReportDateFromEmsBatchDataDate(emsBatchDataDate);

  const gasMasterPath = path.join(MASTER_SHEETS_DIR, HCCP_GAS_MASTER_FILENAME);
  const powerSolarPath = path.join(MASTER_SHEETS_DIR, POWER_SOLAR_MASTER_FILENAME);
  const top10Path = path.join(MASTER_SHEETS_DIR, TOP10_MASTER_FILENAME);
  const feedInPath = path.join(MASTER_SHEETS_DIR, RAW_CONVERSION_FEED_IN_MASTER);
  for (const [label, p] of [
    [POWER_SOLAR_MASTER_FILENAME, powerSolarPath],
    [TOP10_MASTER_FILENAME, top10Path],
    [HCCP_GAS_MASTER_FILENAME, gasMasterPath],
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
      dataDate: reportDate,
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
      dataDate: reportDate,
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

  let gasConversionSummary = "";
  let gasConsumptionDate = "";
  let gasManualEntry: GasManualEntryPrompt | undefined;
  const skipGas = options.skipGasConversion === true;
  try {
    const archiveMeta = await saveHccpGasCapacityUpload(hccpGasCapacity.content);
    const pruned = await pruneHccpGasCapacityArchive(emsBatchDataDate);
    gasConsumptionDate = reportDate;
    if (skipGas) {
      gasConversionSummary = ` HCCP Gas Capacity archived (${archiveMeta.filename}${pruned.length > 0 ? `; pruned ${pruned.join(", ")}` : ""}); gas conversion skipped.`;
    } else {
      const capacityTexts = await loadHccpGasCapacityCsvTextsForConsumption(
        gasConsumptionDate,
        hccpGasCapacity.content,
      );
      const allCapacityTexts = [
        ...capacityTexts,
        ...(options.capacitySupplementTexts ?? []),
      ];
      const outdoorAirTempC = outdoorAirTempFromDaily1Csv(rawCsvByLogicalId);
      if (outdoorAirTempC === null) {
        return {
          ok: false,
          status: 400,
          body: {
            error:
              "Could not compute outdoor air temperature from CCP+HCCP Daily1 (column BY)",
          },
        };
      }
      const gasResult = await convertHccpGasMaster({
        capacityCsvTexts: allCapacityTexts,
        masterWorkbookPath: gasMasterPath,
        consumptionDate: gasConsumptionDate,
        outdoorAirTempC,
      });
      gasConversionSummary = ` Gas master ${gasConsumptionDate}: M1 ${gasResult.meter1}, M2 ${gasResult.meter2}, total ${gasResult.gasConsumptionUnits} units (archived ${archiveMeta.filename}${pruned.length > 0 ? `; pruned ${pruned.join(", ")}` : ""}).`;
      gasManualEntry = {
        consumptionDate: gasConsumptionDate,
        required: true,
      };
    }
  } catch (error) {
    if (error instanceof HccpGasConversionError) {
      return {
        ok: false,
        status: 400,
        body: { error: error.message, code: error.code },
      };
    }
    const message =
      error instanceof Error ? error.message : "HCCP gas conversion failed";
    return { ok: false, status: 400, body: { error: message } };
  }

  const warnings = validateRawCsvBatch(
    csvContents.map(({ logicalId, content }) => ({
      filename: logicalId,
      content,
    })),
  );

  clearDataStoreCache();
  revalidatePath("/");

  await saveRawSnapshotForDate(reportDate, [
    ...[...byLogicalId.entries()].map(([logicalId, { content }]) => ({
      logicalId,
      content,
    })),
    {
      logicalId: HCCP_GAS_CAPACITY_LOGICAL_ID,
      content: hccpGasCapacity.content,
    },
    {
      logicalId: RAW_CONVERSION_FEED_IN_MASTER,
      content: feedInFile.buffer,
    },
  ]);
  await saveMasterSnapshotForDate(reportDate);

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
    gasManualEntry,
    message:
      warnings.length > 0
        ? `Processed raw batch for ${reportDate} (${warnings.length} validation warning(s)). Top_10 and Power_Solar updated.${skipGas ? " Gas conversion skipped." : " Gas meters updated."}${gasConversionSummary}${gasManualEntry ? " Enter gas occupancy in the dialog." : ""}`
        : `Processed raw batch for ${reportDate} with no validation warnings. Top_10 and Power_Solar updated.${skipGas ? " Gas conversion skipped." : " Gas meters updated."}${gasConversionSummary}${gasManualEntry ? " Enter gas occupancy in the dialog." : ""}`,
  };
}

/** @deprecated Use handleRawConversionUpload */
export const handleRawCsvUploadStub = handleRawConversionUpload;
