import * as XLSX from "xlsx";
import {
  excelSerialToDate,
  normalizeHeader,
} from "@/lib/datastore/parsers/excel-utils";
import { excelSerialMatchesIsoDate, isoDateToExcelSerial } from "@/lib/raw-to-master/excel-date";

export const WEBSS_SHEET_NAME = "WebSS_Data";

/** RawData meter id → WebSS_Data column A ids to try (golden aliases). */
export const TOP10_WEBSS_METER_ALIASES: Record<string, string[]> = {
  "SS205_Tx(All-EA8)": ["SS205"],
  MRSS208HV: ["MRSS208_HV"],
};

export function normalizeTop10Location(value: unknown): string {
  return String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function webSsRowKey(meterId: string, location: string): string {
  return `${normalizeHeader(meterId)}|${normalizeHeader(normalizeTop10Location(location))}`;
}

export function buildWebSsRowIndex(
  sheet: XLSX.WorkSheet,
): Map<string, number> {
  const map = new Map<string, number>();
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  for (let row = 1; row <= range.e.r; row += 1) {
    const meter = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })]?.v;
    const location = sheet[XLSX.utils.encode_cell({ r: row, c: 1 })]?.v;
    if (!meter) continue;
    map.set(
      webSsRowKey(String(meter), normalizeTop10Location(location)),
      row,
    );
  }
  return map;
}

function uniqueRowForMeter(
  index: Map<string, number>,
  meterId: string,
): number | null {
  const meterNorm = normalizeHeader(meterId);
  let found: number | undefined;
  for (const [key, row] of index) {
    if (!key.startsWith(`${meterNorm}|`)) continue;
    if (found !== undefined && found !== row) return null;
    found = row;
  }
  return found ?? null;
}

export function resolveWebSsRow(
  index: Map<string, number>,
  meterId: string,
  location: string,
): number | null {
  const candidates = [
    meterId,
    ...(TOP10_WEBSS_METER_ALIASES[meterId] ?? []),
  ];
  const loc = normalizeTop10Location(location);
  for (const candidate of candidates) {
    const row = index.get(webSsRowKey(candidate, loc));
    if (row !== undefined) return row;
  }
  for (const candidate of candidates) {
    const row = uniqueRowForMeter(index, candidate);
    if (row !== null) return row;
  }
  return null;
}

/** Resolve mapping entry for a WebSS sheet row (same rules as raw conversion). */
export function findMappingForWebSsRow<
  T extends { meter: string; location: string; kind?: string },
>(index: Map<string, number>, sheetRow: number, rows: T[]): T | undefined {
  for (const row of rows) {
    if (row.kind === "skip" && !String(row.meter).trim() && !String(row.location).trim()) {
      continue;
    }
    const resolved = resolveWebSsRow(index, String(row.meter), row.location);
    if (resolved === sheetRow) return row;
  }
  return undefined;
}

export function findWebSsDateColumn(
  sheet: XLSX.WorkSheet,
  dataDate: string,
): number | null {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  for (let col = 2; col <= range.e.c; col += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
    if (!cell) continue;
    if (excelSerialMatchesIsoDate(cell.v, dataDate)) {
      return col;
    }
  }
  return null;
}

export function appendWebSsDateColumn(
  sheet: XLSX.WorkSheet,
  dataDate: string,
): number {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  const col = range.e.c + 1;
  const serial = isoDateToExcelSerial(dataDate);
  sheet[XLSX.utils.encode_cell({ r: 0, c: col })] = { t: "n", v: serial };
  sheet["!ref"] = XLSX.utils.encode_range({
    s: range.s,
    e: { r: Math.max(range.e.r, 0), c: col },
  });
  return col;
}

export function listWebSsDates(sheet: XLSX.WorkSheet): string[] {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  const dates: string[] = [];
  for (let col = 2; col <= range.e.c; col += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
    const iso = excelSerialToDate(cell?.v);
    if (iso) dates.push(iso);
  }
  return dates;
}
