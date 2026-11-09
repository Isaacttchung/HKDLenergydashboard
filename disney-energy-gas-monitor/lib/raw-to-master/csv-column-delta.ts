import Papa from "papaparse";
import { parseRawNumericCell } from "@/lib/raw-csv-validation";
import { excelColumnLetterToIndex } from "@/lib/raw-to-master/excel-date";

/** Daily kWh = last non-empty minus first non-empty (CHHP Consumption column). */
export function csvColumnDailyDeltaKwh(
  csvText: string,
  columnLetter: string,
): number | null {
  const colIndex = excelColumnLetterToIndex(columnLetter);
  const parsed = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
  });
  if (parsed.data.length < 2) return null;

  const bodyRows = parsed.data.slice(1);
  let first: number | null = null;
  let last: number | null = null;

  for (const row of bodyRows) {
    const value = parseRawNumericCell(row[colIndex]);
    if (value === null) continue;
    if (first === null) first = value;
    last = value;
  }

  if (first === null || last === null) return null;
  return last - first;
}

/** Daily average of numeric readings in a CSV column (outdoor temp). */
export function csvColumnDailyAverage(
  csvText: string,
  columnLetter: string,
): number | null {
  const colIndex = excelColumnLetterToIndex(columnLetter);
  const parsed = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
  });
  if (parsed.data.length < 2) return null;

  const values: number[] = [];
  for (const row of parsed.data.slice(1)) {
    const value = parseRawNumericCell(row[colIndex]);
    if (value !== null) values.push(value);
  }
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
