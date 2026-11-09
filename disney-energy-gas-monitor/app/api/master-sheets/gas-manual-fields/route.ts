import path from "path";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { clearDataStoreCache } from "@/lib/datastore/master-sheet-store";
import {
  getUploadTokenFromEnv,
  MASTER_SHEETS_DIR,
} from "@/lib/master-sheets-config";
import {
  applyHccpGasManualFields,
  HCCP_GAS_MASTER_FILENAME,
} from "@/lib/raw-to-master/hccp-gas";
import { parseHccpGasManualFields } from "@/lib/raw-to-master/hccp-gas-manual";
import { saveMasterSnapshotForDate } from "@/lib/upload/date-snapshot-store";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Invalid upload token" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const requiredToken = getUploadTokenFromEnv();
  if (requiredToken) {
    const headerToken = request.headers.get("x-upload-token")?.trim();
    if (headerToken !== requiredToken) {
      return unauthorized();
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const consumptionDate = String(
    (body as Record<string, unknown>).consumptionDate ?? "",
  ).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(consumptionDate)) {
    return NextResponse.json(
      { error: "consumptionDate must be YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const fields = parseHccpGasManualFields(
    (body as Record<string, unknown>).fields ??
      (body as Record<string, unknown>),
  );
  if ("error" in fields) {
    return NextResponse.json({ error: fields.error }, { status: 400 });
  }

  const masterPath = path.join(MASTER_SHEETS_DIR, HCCP_GAS_MASTER_FILENAME);
  try {
    const result = await applyHccpGasManualFields({
      masterWorkbookPath: masterPath,
      consumptionDate,
      fields,
    });
    clearDataStoreCache();
    revalidatePath("/");
    await saveMasterSnapshotForDate(consumptionDate);
    return NextResponse.json({
      ok: true,
      consumptionDate: result.consumptionDate,
      overallOccupancy: result.overallOccupancy,
      message: `Updated Gas Meter Reading for ${result.consumptionDate} (columns C–H and L).`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update gas master";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
