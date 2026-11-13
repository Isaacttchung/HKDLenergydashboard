import type ExcelJS from "exceljs";
import {
  excelSerialToDate,
  normalizeHeader,
} from "@/lib/datastore/parsers/excel-utils";
import {
  excelSerialMatchesIsoDate,
  isoDateToExcelSerial,
} from "@/lib/raw-to-master/excel-date";
import {
  copyRowPresentationExcel,
  copyCellPresentation,
} from "@/lib/raw-to-master/exceljs-preserve";
import {
  POWER_SOLAR_SHEET_CONFIG,
  type PowerSolarArea,
} from "@/lib/raw-to-master/power-solar-mappings";

function cellIsoDate(value: ExcelJS.CellValue): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") return excelSerialToDate(value);
  return null;
}

export function buildHeaderColumnMapExcel(
  sheet: ExcelJS.Worksheet,
  headerRowIndex: number,
): Map<string, number> {
  const map = new Map<string, number>();
  const excelHeaderRow = headerRowIndex + 1;
  const row = sheet.getRow(excelHeaderRow);
  row.eachCell({ includeEmpty: false }, (cell, col) => {
    const text = String(cell.value ?? "").trim();
    if (text) map.set(normalizeHeader(text), col);
  });
  return map;
}

export function findPowerSolarDateRow(
  sheet: ExcelJS.Worksheet,
  dataDate: string,
  firstDataRowIndex: number,
): number | null {
  const excelFirstDataRow = firstDataRowIndex + 1;
  const last = sheet.rowCount;
  for (let row = excelFirstDataRow; row <= last; row += 1) {
    const value = sheet.getRow(row).getCell(1).value;
    if (excelSerialMatchesIsoDate(value, dataDate)) return row;
  }
  return null;
}

function findLastDateRow(sheet: ExcelJS.Worksheet, firstDataRowIndex: number): number | null {
  const excelFirstDataRow = firstDataRowIndex + 1;
  let last: number | null = null;
  for (let row = excelFirstDataRow; row <= sheet.rowCount; row += 1) {
    if (cellIsoDate(sheet.getRow(row).getCell(1).value)) last = row;
  }
  return last;
}

export function ensurePowerSolarDateRow(
  sheet: ExcelJS.Worksheet,
  dataDate: string,
  firstDataRowIndex: number,
): number {
  const existing = findPowerSolarDateRow(sheet, dataDate, firstDataRowIndex);
  if (existing !== null) return existing;

  const templateRow = findLastDateRow(sheet, firstDataRowIndex);
  if (templateRow === null) {
    throw new Error("Power_Solar sheet has no dated rows to use as template");
  }

  const insertAt = templateRow + 1;
  sheet.spliceRows(insertAt, 0, []);
  const template = sheet.getRow(templateRow);
  const newRow = sheet.getRow(insertAt);
  copyRowPresentationExcel(template, newRow);

  const serial = isoDateToExcelSerial(dataDate);
  const utc = new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000);
  newRow.getCell(1).value = utc;

  return insertAt;
}

export function setNumericCellExcel(
  sheet: ExcelJS.Worksheet,
  row: number,
  col: number,
  value: number,
  styleTemplate?: ExcelJS.Cell,
): void {
  const cell = sheet.getRow(row).getCell(col);
  if (styleTemplate) {
    copyCellPresentation(styleTemplate, cell);
  }
  cell.value = value;
}

export function getPowerSolarSheet(
  workbook: ExcelJS.Workbook,
  area: PowerSolarArea,
): ExcelJS.Worksheet {
  const name = POWER_SOLAR_SHEET_CONFIG[area].sheetName;
  const sheet = workbook.getWorksheet(name);
  if (!sheet) {
    throw new Error(`Power_Solar master missing sheet "${name}"`);
  }
  return sheet;
}
