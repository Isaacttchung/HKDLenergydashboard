import type { EnergyRecord } from "@/lib/types";

/** EMS daily report is considered complete when Theme Park electricity is present. */
export function hasDailyReportData(
  records: EnergyRecord[],
  date: string,
): boolean {
  return records.some(
    (record) =>
      record.date === date &&
      record.sourceId === "park" &&
      record.energyType === "electricity",
  );
}

export function latestDailyReportDate(records: EnergyRecord[]): string | null {
  let latest: string | null = null;
  for (const record of records) {
    if (
      record.sourceId !== "park" ||
      record.energyType !== "electricity" ||
      !record.date
    ) {
      continue;
    }
    if (latest === null || record.date > latest) {
      latest = record.date;
    }
  }
  return latest;
}

export function hasResortGasReading(
  records: EnergyRecord[],
  date: string,
): boolean {
  return records.some(
    (record) =>
      record.date === date &&
      record.sourceId === "resort-gas" &&
      record.energyType === "gas",
  );
}
