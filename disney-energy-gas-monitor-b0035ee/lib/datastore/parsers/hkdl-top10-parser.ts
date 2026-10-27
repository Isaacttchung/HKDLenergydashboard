import type { WorkBook } from "xlsx";
import * as XLSX from "xlsx";
import {
  excelSerialToDate,
  parseMetricValue,
} from "@/lib/datastore/parsers/excel-utils";

const PREFERRED_SHEET_NAME = "WebSS_Data";

function findWebSsDataSheet(workbook: WorkBook) {
  if (workbook.Sheets[PREFERRED_SHEET_NAME]) {
    return workbook.Sheets[PREFERRED_SHEET_NAME];
  }
  const matchName = workbook.SheetNames.find(
    (name) => name.replace(/\s+/g, "_").toLowerCase() === "webss_data",
  );
  return matchName ? workbook.Sheets[matchName] : undefined;
}

export interface Top10MeterSeries {
  meterId: string;
  location: string;
  readingsByDate: Record<string, number>;
}

export interface Top10WorkbookData {
  dates: string[];
  meters: Top10MeterSeries[];
}

function normalizeLocationKey(value: unknown): string {
  return String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseHkdlTop10Workbook(workbook: WorkBook): Top10WorkbookData {
  const sheet = findWebSsDataSheet(workbook);
  if (!sheet) {
    throw new Error(
      `Missing WebSS data sheet in Top 10 workbook (expected "${PREFERRED_SHEET_NAME}")`,
    );
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });

  if (matrix.length < 2) {
    return { dates: [], meters: [] };
  }

  const headerRow = matrix[0] as unknown[];
  const dates: string[] = [];

  for (let columnIndex = 2; columnIndex < headerRow.length; columnIndex += 1) {
    const date = excelSerialToDate(headerRow[columnIndex]);
    if (date) dates.push(date);
  }

  const meters: Top10MeterSeries[] = [];

  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex] as unknown[];
    const meterId = String(row[0] ?? "").trim();
    const location = normalizeLocationKey(row[1]);
    if (!meterId) continue;

    const readingsByDate: Record<string, number> = {};

    for (let columnIndex = 2; columnIndex < headerRow.length; columnIndex += 1) {
      const date = excelSerialToDate(headerRow[columnIndex]);
      if (!date) continue;

      const value = parseMetricValue(row[columnIndex]);
      if (value !== null) {
        readingsByDate[date] = value;
      }
    }

    meters.push({ meterId, location, readingsByDate });
  }

  return { dates, meters };
}
