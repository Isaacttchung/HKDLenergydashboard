import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { clearDataStoreCache } from "@/lib/datastore/master-sheet-store";
import {
  EXPECTED_MASTER_SHEET_FILES,
  resolveExpectedMasterSheetFilename,
  MASTER_SHEETS_DIR,
} from "@/lib/master-sheets-config";
import { getMasterSheetsHostStatus } from "@/lib/master-sheets-status";
import { classifyUploadBatch } from "@/lib/upload/batch-classifier";
import {
  checkDuplicateUploadDate,
  parseReplaceExisting,
} from "@/lib/upload/duplicate-date-guard";
import {
  checkOutOfOrderUpload,
  parseConfirmOutOfOrderUpload,
} from "@/lib/upload/out-of-order-upload-guard";
import {
  extractMasterBatchDataDate,
  extractRawReportDateFromFiles,
} from "@/lib/upload/extract-batch-data-date";
import { saveMasterSnapshotForDate } from "@/lib/upload/date-snapshot-store";
import {
  extractPrimaryHccpGasCapacityCsv,
  readHccpGasCapacitySupplements,
} from "@/lib/upload/extract-hccp-gas-from-form";
import {
  GAS_CAPACITY_PREFLIGHT_CODE,
  parseSkipGasConversion,
  preflightHccpGasCapacityForConsumption,
} from "@/lib/upload/hccp-gas-capacity-preflight";
import { handleRawConversionUpload } from "@/lib/upload/raw-upload-stub";
import {
  checkMasterSheetUploadToken,
  isMasterSheetUploadTokenRequired,
} from "@/lib/upload/upload-token-auth";

export const runtime = "nodejs";

const MAX_BYTES = 40 * 1024 * 1024;

function sanitizeFilename(raw: string): string | null {
  const base = path.basename(raw);
  if (!base || base !== raw.replace(/^.*[/\\]/, "")) return null;
  if (base.includes("..")) return null;
  const lower = base.toLowerCase();
  if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) return null;
  return base;
}

export async function GET() {
  try {
    const host = await getMasterSheetsHostStatus();

    return NextResponse.json({
      requiresToken: isMasterSheetUploadTokenRequired(),
      expected: host.expected.map(({ name, present, modifiedAt, sizeBytes }) => ({
        name,
        present,
        modifiedAt,
        sizeBytes,
      })),
      directory: "data/master-sheets",
      masterSheetsDirectory: host.masterSheetsDirectory,
      workingDirectory: host.workingDirectory,
      latestReportDate: host.latestReportDate,
      earliestDataDate: host.earliestDataDate,
      extraSpreadsheetFiles: host.extraSpreadsheetFiles,
    });
  } catch (error) {
    console.error("Master sheets status error:", error);
    return NextResponse.json(
      { error: "Could not read master sheets folder" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const authFail = checkMasterSheetUploadToken(request, {
    formToken: String(form.get("uploadToken") ?? ""),
  });
  if (authFail) return authFail;
  return handleUpload(form);
}

async function handleUpload(form: FormData) {
  const entries = form.getAll("files");
  if (entries.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const files: File[] = entries.filter((e): e is File => e instanceof File);
  const replaceExisting = parseReplaceExisting(form);
  const confirmOutOfOrder = parseConfirmOutOfOrderUpload(form);
  const classification = classifyUploadBatch(files.map((f) => f.name));

  if (classification.kind === "invalid") {
    const { error, missing, uploaded, requiredCount, extraMasters } =
      classification;
    return NextResponse.json(
      {
        error,
        ...(missing ? { missing } : {}),
        ...(uploaded ? { uploaded } : {}),
        ...(requiredCount !== undefined ? { requiredCount } : {}),
        ...(extraMasters ? { extraMasters } : {}),
      },
      { status: 400 },
    );
  }

  if (classification.kind === "raw_conversion") {
    const incomingDate = await extractRawReportDateFromFiles(files);
    const duplicate = await checkDuplicateUploadDate({
      incomingDate,
      replaceExisting,
    });
    if (duplicate) {
      return NextResponse.json(
        {
          error: "Duplicate data date",
          duplicateDate: duplicate.duplicateDate,
          message: duplicate.message,
        },
        { status: 409 },
      );
    }

    const outOfOrder = await checkOutOfOrderUpload({
      incomingDate,
      replaceExisting,
      confirmOutOfOrder,
    });
    if (outOfOrder) {
      return NextResponse.json(
        {
          error: "Out of order upload",
          code: "OUT_OF_ORDER",
          outOfOrder: true,
          incomingDate: outOfOrder.incomingDate,
          latestUploadDate: outOfOrder.latestUploadDate,
          message: outOfOrder.message,
        },
        { status: 409 },
      );
    }

    const skipGasConversion = parseSkipGasConversion(form);
    const capacitySupplementTexts = await readHccpGasCapacitySupplements(form);

    if (!skipGasConversion && incomingDate) {
      const primaryCapacityCsv = await extractPrimaryHccpGasCapacityCsv(files);
      if (primaryCapacityCsv) {
        const preflight = await preflightHccpGasCapacityForConsumption(
          incomingDate,
          primaryCapacityCsv,
          capacitySupplementTexts,
        );
        if (!preflight.ok) {
          return NextResponse.json(
            {
              error: "Missing gas capacity midnights",
              code: GAS_CAPACITY_PREFLIGHT_CODE,
              gasCapacityPreflight: true,
              consumptionDate: preflight.consumptionDate,
              missingDates: preflight.missingDates,
              message: preflight.message,
            },
            { status: 409 },
          );
        }
      }
    }

    const outcome = await handleRawConversionUpload(files, {
      replaceExisting,
      skipGasConversion,
      capacitySupplementTexts,
    });
    if (!outcome.ok) {
      return NextResponse.json(outcome.body, { status: outcome.status });
    }
    const host = await getMasterSheetsHostStatus();
    return NextResponse.json({
      ok: true,
      mode: "raw",
      saved: outcome.saved,
      warnings: outcome.warnings,
      logicalIds: outcome.logicalIds,
      downloadableAfterWarnings: outcome.downloadableAfterWarnings,
      gasManualEntry: outcome.gasManualEntry ?? null,
      latestDate: host.latestReportDate,
      earliestDate: host.earliestDataDate,
      message: outcome.message,
    });
  }

  const incomingDate = await extractMasterBatchDataDate(files);
  const duplicate = await checkDuplicateUploadDate({
    incomingDate,
    replaceExisting,
  });
  if (duplicate) {
    return NextResponse.json(
      {
        error: "Duplicate data date",
        duplicateDate: duplicate.duplicateDate,
        message: duplicate.message,
      },
      { status: 409 },
    );
  }

  await mkdir(MASTER_SHEETS_DIR, { recursive: true });

  const saved: string[] = [];
  const skipped: Array<{ name: string; reason: string }> = [];
  const writtenMasters = new Set<string>();

  for (const entry of files) {
    if (!(entry instanceof File)) continue;

    const safeName = sanitizeFilename(entry.name);
    if (!safeName) {
      skipped.push({ name: entry.name, reason: "Invalid filename" });
      continue;
    }
    const canonicalName = resolveExpectedMasterSheetFilename(safeName);
    if (!canonicalName) {
      skipped.push({
        name: safeName,
        reason:
          "Not recognized as one of the four HKDL master sheets (check name matches gas, solar, power, or top 10)",
      });
      continue;
    }
    if (entry.size > MAX_BYTES) {
      skipped.push({ name: safeName, reason: "File too large (max 40 MB)" });
      continue;
    }

    const buffer = Buffer.from(await entry.arrayBuffer());
    await writeFile(path.join(MASTER_SHEETS_DIR, canonicalName), buffer);
    writtenMasters.add(canonicalName);
    saved.push(
      canonicalName === safeName
        ? canonicalName
        : `${safeName} → ${canonicalName}`,
    );
  }

  const missingMasters = EXPECTED_MASTER_SHEET_FILES.filter(
    (m) => !writtenMasters.has(m),
  );
  if (missingMasters.length > 0 || skipped.length > 0) {
    return NextResponse.json(
      {
        error: "Incomplete master batch (all four canonical workbooks required)",
        missing: missingMasters,
        skipped,
      },
      { status: 400 },
    );
  }

  clearDataStoreCache();
  revalidatePath("/");

  if (incomingDate) {
    await saveMasterSnapshotForDate(incomingDate);
  }

  const host = await getMasterSheetsHostStatus();

  return NextResponse.json({
    ok: true,
    mode: "master",
    saved,
    warnings: [],
    downloadableAfterWarnings: [],
    latestDate: host.latestReportDate,
    earliestDate: host.earliestDataDate,
    masterSheetsDirectory: host.masterSheetsDirectory,
    workingDirectory: host.workingDirectory,
    extraSpreadsheetFiles: host.extraSpreadsheetFiles,
    message:
      host.latestReportDate != null
        ? `Master sheets updated on the host PC. Latest EMS report date is now ${host.latestReportDate}.`
        : "Master sheets updated on the host PC.",
  });
}
