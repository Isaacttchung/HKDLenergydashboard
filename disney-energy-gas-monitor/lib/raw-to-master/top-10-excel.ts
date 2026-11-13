import type ExcelJS from "exceljs";
import { excelSerialToDate, normalizeHeader } from "@/lib/datastore/parsers/excel-utils";
import {
  excelSerialMatchesIsoDate,
  isoDateToExcelSerial,
} from "@/lib/raw-to-master/excel-date";
import { copyColumnPresentation } from "@/lib/raw-to-master/exceljs-preserve";
import {
  WEBSS_SHEET_NAME,
  normalizeTop10Location,
  TOP10_WEBSS_METER_ALIASES,
  webSsRowKey,
} from "@/lib/raw-to-master/top-10-webss";

/** WebSS_Data row 1 = dates; column A/B = meter/location (Excel 1-based). */
export const WEBSS_DATE_HEADER_ROW = 1;
export const WEBSS_FIRST_DATA_ROW = 2;
export const WEBSS_FIRST_DATE_COL = 3;

export function buildWebSsRowIndexExcel(
  sheet: ExcelJS.Worksheet,
): Map<string, number> {
  const map = new Map<string, number>();
  const last = sheet.rowCount;
  for (let row = WEBSS_FIRST_DATA_ROW; row <= last; row += 1) {
    const meter = sheet.getRow(row).getCell(1).value;
    const location = sheet.getRow(row).getCell(2).value;
    if (meter == null || String(meter).trim() === "") continue;
    map.set(
      webSsRowKey(String(meter), normalizeTop10Location(location)),
      row,
    );
  }
  return map;
}

function cellIsoDate(value: ExcelJS.CellValue): string | null {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    return excelSerialToDate(value);
  }
  return null;
}

export function findWebSsDateColumnExcel(
  sheet: ExcelJS.Worksheet,
  dataDate: string,
): number | null {
  const lastCol = sheet.columnCount;
  for (let col = WEBSS_FIRST_DATE_COL; col <= lastCol; col += 1) {
    const value = sheet.getRow(WEBSS_DATE_HEADER_ROW).getCell(col).value;
    if (excelSerialMatchesIsoDate(value, dataDate)) {
      return col;
    }
  }
  return null;
}

function lastPopulatedDateColumn(sheet: ExcelJS.Worksheet): number | null {
  let last: number | null = null;
  const lastCol = sheet.columnCount;
  for (let col = WEBSS_FIRST_DATE_COL; col <= lastCol; col += 1) {
    const iso = cellIsoDate(
      sheet.getRow(WEBSS_DATE_HEADER_ROW).getCell(col).value,
    );
    if (iso) last = col;
  }
  return last;
}

/** Append a date column, cloning presentation from the previous date column. */
export function appendWebSsDateColumnExcel(
  sheet: ExcelJS.Worksheet,
  dataDate: string,
): number {
  const templateCol = lastPopulatedDateColumn(sheet);
  const newCol = templateCol !== null ? templateCol + 1 : WEBSS_FIRST_DATE_COL;
  const lastRow = Math.max(sheet.rowCount, WEBSS_FIRST_DATA_ROW);

  if (templateCol !== null) {
    copyColumnPresentation(
      sheet,
      templateCol,
      newCol,
      WEBSS_DATE_HEADER_ROW,
      lastRow,
    );
  }

  const serial = isoDateToExcelSerial(dataDate);
  const utc = new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000);
  sheet.getRow(WEBSS_DATE_HEADER_ROW).getCell(newCol).value = utc;

  return newCol;
}

export function resolveWebSsRowExcel(
  index: Map<string, number>,
  meterId: string,
  location: string,
): number | null {
  const candidates = [meterId, ...(TOP10_WEBSS_METER_ALIASES[meterId] ?? [])];
  const loc = normalizeTop10Location(location);
  for (const candidate of candidates) {
    const row = index.get(webSsRowKey(candidate, loc));
    if (row !== undefined) return row;
  }
  const meterNorm = normalizeHeader(meterId);
  let found: number | undefined;
  for (const [key, row] of index) {
    if (!key.startsWith(`${meterNorm}|`)) continue;
    if (found !== undefined && found !== row) return null;
    found = row;
  }
  return found ?? null;
}

export function getWebSsSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  const sheet = workbook.getWorksheet(WEBSS_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Top_10 master missing sheet "${WEBSS_SHEET_NAME}"`);
  }
  return sheet;
}
