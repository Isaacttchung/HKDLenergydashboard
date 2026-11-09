/**
 * HKDL daily reporting: EMS CSVs carry one calendar day of readings. The
 * `Timestamp` on the first row is that day (e.g. 2026-11-08 00:15 … through
 * end-of-period into 2026-11-09 00:00). Masters use that same calendar date.
 */
export function addIsoDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d + days);
  return new Date(utc).toISOString().slice(0, 10);
}

/** Master / dashboard date from the shared EMS batch data date (Timestamp day). */
export function dailyReportDateFromEmsBatchDataDate(
  emsBatchDataDate: string,
): string {
  return emsBatchDataDate;
}

/** @deprecated Name retained for call sites — no longer subtracts a day. */
export function dailyReportDateFromEmsBatchStamp(
  emsBatchDataDate: string,
): string {
  return dailyReportDateFromEmsBatchDataDate(emsBatchDataDate);
}
