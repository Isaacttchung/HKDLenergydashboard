import { excelSerialToDate } from "@/lib/datastore/parsers/excel-utils";

/** Excel 1900-date-system serial for UTC midnight on an ISO date. */
export function isoDateToExcelSerial(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d);
  return (utc - Date.UTC(1899, 11, 30)) / 86_400_000;
}

export function excelSerialMatchesIsoDate(
  serial: unknown,
  isoDate: string,
): boolean {
  const parsed = excelSerialToDate(serial);
  return parsed === isoDate;
}

/** `A` → 0, `Z` → 25, `AA` → 26 */
export function excelColumnLetterToIndex(letter: string): number {
  let index = 0;
  for (const char of letter.toUpperCase()) {
    index = index * 26 + (char.charCodeAt(0) - 64);
  }
  return index - 1;
}
