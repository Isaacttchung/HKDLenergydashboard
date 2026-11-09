import { csvColumnDailyAverage } from "@/lib/raw-to-master/csv-column-delta";

export const OUTDOOR_TEMP_RAW_LOGICAL_ID = "CCP+HCCP_Daily1";
export const OUTDOOR_TEMP_COLUMN = "BY";

/** Daily average outdoor air temperature (°C) from EMS Daily1 — same as Top_10 row 301. */
export function outdoorAirTempFromDaily1Csv(
  rawCsvByLogicalId: Record<string, string>,
): number | null {
  const csv = rawCsvByLogicalId[OUTDOOR_TEMP_RAW_LOGICAL_ID];
  if (!csv) return null;
  return csvColumnDailyAverage(csv, OUTDOOR_TEMP_COLUMN);
}
