import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  getUploadTokenFromEnv,
  isExpectedMasterSheetFilename,
  MASTER_SHEETS_DIR,
} from "@/lib/master-sheets-config";
import { resolveDateSnapshotPath } from "@/lib/upload/date-snapshot-store";
import { isRawDownloadId } from "@/lib/upload/is-raw-download-id";
import { resolveStagedRawFilePath } from "@/lib/upload/resolve-staged-raw-file";
import { RAW_CONVERSION_FEED_IN_MASTER } from "@/lib/upload/batch-classifier";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Invalid upload token" }, { status: 401 });
}

function checkToken(request: NextRequest): NextResponse | null {
  const requiredToken = getUploadTokenFromEnv();
  if (!requiredToken) return null;
  const headerToken = request.headers.get("x-upload-token")?.trim();
  const queryToken = request.nextUrl.searchParams.get("uploadToken")?.trim();
  if (headerToken !== requiredToken && queryToken !== requiredToken) {
    return unauthorized();
  }
  return null;
}

function contentTypeForDownload(
  kind: "raw" | "master",
  id: string,
  basename: string,
): string {
  if (
    kind === "raw" &&
    (id === RAW_CONVERSION_FEED_IN_MASTER ||
      basename.toLowerCase().endsWith(".xlsx"))
  ) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  return "text/csv; charset=utf-8";
}

export async function GET(request: NextRequest) {
  const authFailure = checkToken(request);
  if (authFailure) return authFailure;

  const kind = request.nextUrl.searchParams.get("kind");
  const id = request.nextUrl.searchParams.get("id")?.trim();
  const reportDate = request.nextUrl.searchParams.get("date")?.trim();

  if (!kind || !id) {
    return NextResponse.json(
      { error: "Query params kind and id are required" },
      { status: 400 },
    );
  }

  if (kind === "raw") {
    if (!isRawDownloadId(id)) {
      return NextResponse.json({ error: "Unknown raw file id" }, { status: 400 });
    }
  } else if (kind === "master") {
    if (!isExpectedMasterSheetFilename(id)) {
      return NextResponse.json(
        { error: "Unknown master workbook name" },
        { status: 400 },
      );
    }
  } else {
    return NextResponse.json(
      { error: "kind must be raw or master" },
      { status: 400 },
    );
  }

  let filePath: string | null = null;
  if (reportDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
      return NextResponse.json(
        { error: "date must be YYYY-MM-DD" },
        { status: 400 },
      );
    }
    filePath = await resolveDateSnapshotPath(
      reportDate,
      kind as "raw" | "master",
      id,
    );
    if (!filePath) {
      return NextResponse.json(
        {
          error: `No saved ${kind === "raw" ? "raw data" : "master"} snapshot for ${reportDate}. Upload Option A for that day first.`,
        },
        { status: 404 },
      );
    }
  } else if (kind === "raw") {
    filePath = await resolveStagedRawFilePath(id);
    if (!filePath && id === RAW_CONVERSION_FEED_IN_MASTER) {
      filePath = path.join(MASTER_SHEETS_DIR, id);
      try {
        await readFile(filePath);
      } catch {
        filePath = null;
      }
    }
    if (!filePath) {
      return NextResponse.json({ error: "Raw file not found on host" }, {
        status: 404,
      });
    }
  } else {
    filePath = path.join(MASTER_SHEETS_DIR, id);
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(filePath);
  } catch {
    return NextResponse.json({ error: "File not found on host" }, { status: 404 });
  }

  const basename = path.basename(filePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentTypeForDownload(
        kind as "raw" | "master",
        id,
        basename,
      ),
      "Content-Disposition": `attachment; filename="${basename}"`,
    },
  });
}
