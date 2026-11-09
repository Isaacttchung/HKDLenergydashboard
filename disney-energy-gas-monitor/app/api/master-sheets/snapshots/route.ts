import { NextRequest, NextResponse } from "next/server";
import {
  listMastersInSnapshot,
  listRawLogicalIdsInSnapshot,
  snapshotExistsForDate,
} from "@/lib/upload/date-snapshot-store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date")?.trim();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Query param date (YYYY-MM-DD) is required" },
      { status: 400 },
    );
  }

  const [rawAvailable, mastersAvailable, hasSnapshot] = await Promise.all([
    listRawLogicalIdsInSnapshot(date),
    listMastersInSnapshot(date),
    snapshotExistsForDate(date),
  ]);

  return NextResponse.json({
    date,
    rawAvailable,
    mastersAvailable,
    hasSnapshot,
  });
}
