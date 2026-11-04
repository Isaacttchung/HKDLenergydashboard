import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  getUploadTokenFromEnv,
  isExpectedMasterSheetFilename,
  MASTER_SHEETS_DIR,
} from "@/lib/master-sheets-config";
import { EXPECTED_RAW_LOGICAL_IDS } from "@/lib/raw-data-config";
import { resolveStagedRawFilePath } from "@/lib/upload/resolve-staged-raw-file";

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

export async function GET(request: NextRequest) {
  const authFailure = checkToken(request);
  if (authFailure) return authFailure;

  const kind = request.nextUrl.searchParams.get("kind");
  const id = request.nextUrl.searchParams.get("id")?.trim();

  if (!kind || !id) {
    return NextResponse.json(
      { error: "Query params kind and id are required" },
      { status: 400 },
    );
  }

  if (kind === "raw") {
    if (!(EXPECTED_RAW_LOGICAL_IDS as readonly string[]).includes(id)) {
      return NextResponse.json({ error: "Unknown raw logical id" }, { status: 400 });
    }
    const filePath = await resolveStagedRawFilePath(id);
    if (!filePath) {
      return NextResponse.json({ error: "Raw file not found on host" }, { status: 404 });
    }
    const buffer = await readFile(filePath);
    const basename = path.basename(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${basename}"`,
      },
    });
  }

  if (kind === "master") {
    if (!isExpectedMasterSheetFilename(id)) {
      return NextResponse.json(
        { error: "Unknown master workbook name" },
        { status: 400 },
      );
    }
    const filePath = path.join(MASTER_SHEETS_DIR, id);
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${id}"`,
      },
    });
  }

  return NextResponse.json(
    { error: "kind must be raw or master" },
    { status: 400 },
  );
}
