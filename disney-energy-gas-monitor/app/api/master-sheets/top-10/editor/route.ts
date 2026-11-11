import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { clearDataStoreCache } from "@/lib/datastore/master-sheet-store";
import { checkMasterSheetUploadToken } from "@/lib/upload/upload-token-auth";
import { loadTop10EditorSchema } from "@/lib/master-editor/top-10-editor-schema";
import { applyTop10Insert } from "@/lib/master-editor/top-10-insert";
import {
  applyTop10Remove,
} from "@/lib/master-editor/top-10-remove";
import {
  applyTop10Rename,
  Top10EditorError,
} from "@/lib/master-editor/top-10-rename";
import { top10EditorLinkOptions } from "@/lib/raw-to-master/top-10-link-map";

export const runtime = "nodejs";

const linkOptions = top10EditorLinkOptions();

export async function GET(request: NextRequest) {
  const authFail = checkMasterSheetUploadToken(request);
  if (authFail) return authFail;
  try {
    const schema = await loadTop10EditorSchema();
    return NextResponse.json({ ok: true, linkOptions, ...schema });
  } catch (error) {
    console.error("Top 10 editor schema error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load schema" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const authFail = checkMasterSheetUploadToken(request, {
    jsonToken:
      record.uploadToken !== undefined ? String(record.uploadToken) : null,
  });
  if (authFail) return authFail;

  const action = String(record.action ?? "");
  const dryRun = Boolean(record.dryRun);

  try {
    if (action === "rename") {
      const result = await applyTop10Rename(
        {
          currentMeter: String(record.currentMeter ?? ""),
          currentLocation: String(record.currentLocation ?? ""),
          newMeter: String(record.newMeter ?? ""),
          newLocation: String(record.newLocation ?? ""),
        },
        { dryRun },
      );
      if (!dryRun && result.backupDir) {
        clearDataStoreCache();
        revalidatePath("/");
      }
      return NextResponse.json({
        ok: true,
        action,
        dryRun,
        preview: result.preview,
        backupDir: result.backupDir,
      });
    }

    if (action === "insert") {
      const feedIn = record.feedInTariffColumns;
      const feedInArr = Array.isArray(feedIn)
        ? feedIn.map(String)
        : String(feedIn ?? "")
            .split(/[,;\s]+/)
            .filter(Boolean);

      const result = await applyTop10Insert(
        {
          anchorMeter: String(record.anchorMeter ?? ""),
          anchorLocation: String(record.anchorLocation ?? ""),
          meter: String(record.meter ?? ""),
          location: String(record.location ?? ""),
          kind: String(record.kind ?? "plain") as "plain" | "solar" | "skip",
          importLink:
            record.importLink !== undefined
              ? Number(record.importLink)
              : undefined,
          importCol:
            record.importCol !== undefined
              ? String(record.importCol)
              : undefined,
          recLink:
            record.recLink !== undefined ? Number(record.recLink) : undefined,
          recCol:
            record.recCol !== undefined ? String(record.recCol) : undefined,
          feedInTariffColumns: feedInArr,
        },
        { dryRun },
      );
      if (!dryRun && result.backupDir) {
        clearDataStoreCache();
        revalidatePath("/");
      }
      return NextResponse.json({
        ok: true,
        action,
        dryRun,
        preview: result.preview,
        backupDir: result.backupDir,
      });
    }

    if (action === "remove") {
      const result = await applyTop10Remove(
        {
          meter: String(record.meter ?? ""),
          location: String(record.location ?? ""),
        },
        { dryRun },
      );
      if (!dryRun && result.backupDir) {
        clearDataStoreCache();
        revalidatePath("/");
      }
      return NextResponse.json({
        ok: true,
        action,
        dryRun,
        preview: result.preview,
        backupDir: result.backupDir,
      });
    }

    return NextResponse.json(
      { error: 'action must be "rename", "insert", or "remove"' },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof Top10EditorError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Top 10 editor apply error:", error);
    return NextResponse.json({ error: "Could not apply change" }, { status: 500 });
  }
}
