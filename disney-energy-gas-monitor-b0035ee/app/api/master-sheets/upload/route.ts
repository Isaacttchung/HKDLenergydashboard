import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { clearDataStoreCache } from "@/lib/datastore/master-sheet-store";
import {
  EXPECTED_MASTER_SHEET_FILES,
  getUploadTokenFromEnv,
  resolveExpectedMasterSheetFilename,
  MASTER_SHEETS_DIR,
} from "@/lib/master-sheets-config";
import { getMasterSheetsHostStatus } from "@/lib/master-sheets-status";

export const runtime = "nodejs";

const MAX_BYTES = 40 * 1024 * 1024;

function unauthorized() {
  return NextResponse.json({ error: "Invalid upload token" }, { status: 401 });
}

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
      requiresToken: Boolean(getUploadTokenFromEnv()),
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
  const requiredToken = getUploadTokenFromEnv();
  if (requiredToken) {
    const headerToken = request.headers.get("x-upload-token")?.trim();
    const form = await request.formData();
    const formToken = String(form.get("uploadToken") ?? "").trim();
    if (headerToken !== requiredToken && formToken !== requiredToken) {
      return unauthorized();
    }
    return handleUpload(form);
  }

  const form = await request.formData();
  return handleUpload(form);
}

async function handleUpload(form: FormData) {
  const entries = form.getAll("files");
  if (entries.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  await mkdir(MASTER_SHEETS_DIR, { recursive: true });

  const saved: string[] = [];
  const skipped: Array<{ name: string; reason: string }> = [];

  for (const entry of entries) {
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
    saved.push(
      canonicalName === safeName
        ? canonicalName
        : `${safeName} → ${canonicalName}`,
    );
  }

  if (saved.length === 0) {
    return NextResponse.json(
      { error: "No files were saved", skipped },
      { status: 400 },
    );
  }

  clearDataStoreCache();
  revalidatePath("/");

  const host = await getMasterSheetsHostStatus();

  return NextResponse.json({
    ok: true,
    saved,
    skipped,
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
