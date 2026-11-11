import { normalizeTop10Location } from "@/lib/raw-to-master/top-10-webss";
import type { Top10RawDataRow } from "@/lib/raw-to-master/load-top-10-rawdata-rows";

const PROTECTED_METERS = new Set([
  "outdoor air temperature",
  "ss205_tx(all-ea8)",
]);

export function assertRemovableMappingRow(row: Top10RawDataRow): void {
  const meterNorm = String(row.meter ?? "").trim().toLowerCase();
  if (PROTECTED_METERS.has(meterNorm)) {
    throw new Error(`Cannot remove protected meter "${row.meter}"`);
  }
  if (row.kind === "aggregate300") {
    throw new Error("Cannot remove aggregate300 row (Sum CCP1)");
  }
  if (row.kind === "skip" && !row.meter && !row.location) {
    throw new Error("Cannot remove trailing spacer skip row");
  }
}

export function assertRemovableSheetRow(meter: string, location: string): void {
  const m = meter.trim().toLowerCase();
  if (PROTECTED_METERS.has(m)) {
    throw new Error(`Cannot remove protected meter "${meter}"`);
  }
  if (!meter.trim() && !normalizeTop10Location(location)) {
    throw new Error("Cannot remove empty spacer row");
  }
}
