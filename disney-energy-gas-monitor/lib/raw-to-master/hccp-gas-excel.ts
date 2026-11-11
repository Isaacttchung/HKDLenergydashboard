import ExcelJS from "exceljs";
import { readFile, writeFile } from "fs/promises";
import { excelSerialToDate } from "@/lib/datastore/parsers/excel-utils";
import { isoDateToExcelSerial } from "@/lib/raw-to-master/excel-date";
import {
  computeHccpOverallOccupancy,
  type HccpGasManualFields,
} from "@/lib/raw-to-master/hccp-gas-manual";
import type { HccpGasDailyConsumption } from "@/lib/raw-to-master/hccp-gas";

export const GAS_COL = {
  date: 1,
  thirtyDays: 2,
  ballroom: 3,
  dlh: 4,
  del: 5,
  dhh: 6,
  overall: 7,
  outdoor: 8,
  meter1: 9,
  meter2: 10,
  gasUnits: 11,
  atten: 12,
} as const;

const DATA_SCAN_START_ROW = 2;

function isoFromCellValue(value: ExcelJS.CellValue): string | null {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    return excelSerialToDate(value);
  }
  return null;
}

function copyRowPresentation(source: ExcelJS.Row, target: ExcelJS.Row): void {
  if (source.height) target.height = source.height;
  source.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const targetCell = target.getCell(colNumber);
    targetCell.style = JSON.parse(JSON.stringify(cell.style ?? {}));
    if (cell.numFmt) targetCell.numFmt = cell.numFmt;
  });
}

function setThirtyDaysFormula(row: ExcelJS.Row, excelRow: number): void {
  row.getCell(GAS_COL.thirtyDays).value = {
    formula: `AND(A${excelRow}>=(TODAY()-30),A${excelRow}<TODAY())`,
    result: true,
  };
}

function setOverallOccupancyFormula(row: ExcelJS.Row, excelRow: number): void {
  row.getCell(GAS_COL.overall).value = {
    formula: `((D${excelRow}*400)+(E${excelRow}*750)+(F${excelRow}*600))/1750`,
  };
}

function setGasUnitsFormula(row: ExcelJS.Row, excelRow: number): void {
  row.getCell(GAS_COL.gasUnits).value = {
    formula: `I${excelRow}+J${excelRow}`,
  };
}

export function findGasMeterRowByDate(
  sheet: ExcelJS.Worksheet,
  isoDate: string,
): number | null {
  const last = sheet.rowCount;
  for (let row = DATA_SCAN_START_ROW; row <= last; row += 1) {
    const iso = isoFromCellValue(sheet.getRow(row).getCell(GAS_COL.date).value);
    if (iso === isoDate) return row;
  }
  return null;
}

function findLastDatedRow(sheet: ExcelJS.Worksheet): number | null {
  let last: number | null = null;
  const rowCount = sheet.rowCount;
  for (let row = DATA_SCAN_START_ROW; row <= rowCount; row += 1) {
    const iso = isoFromCellValue(sheet.getRow(row).getCell(GAS_COL.date).value);
    if (iso) last = row;
  }
  return last;
}

/** Add a new dated row after the last data row, copying layout from that row. */
export function ensureGasMeterRow(
  sheet: ExcelJS.Worksheet,
  isoDate: string,
): number {
  const existing = findGasMeterRowByDate(sheet, isoDate);
  if (existing !== null) return existing;

  const templateRowNumber = findLastDatedRow(sheet);
  if (templateRowNumber === null) {
    throw new Error("Gas Meter Reading has no template data rows");
  }

  const insertAt = templateRowNumber + 1;
  sheet.spliceRows(insertAt, 0, []);
  const templateRow = sheet.getRow(templateRowNumber);
  const newRow = sheet.getRow(insertAt);
  copyRowPresentation(templateRow, newRow);

  const serial = isoDateToExcelSerial(isoDate);
  const utc = new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000);
  newRow.getCell(GAS_COL.date).value = utc;

  setThirtyDaysFormula(newRow, insertAt);
  setOverallOccupancyFormula(newRow, insertAt);
  setGasUnitsFormula(newRow, insertAt);

  return insertAt;
}

export function writeGasMeterConsumption(
  row: ExcelJS.Row,
  excelRow: number,
  consumption: HccpGasDailyConsumption,
): void {
  row.getCell(GAS_COL.meter1).value = consumption.meter1;
  row.getCell(GAS_COL.meter2).value = consumption.meter2;
  setGasUnitsFormula(row, excelRow);
}

export function writeGasOutdoorAirTempOnRow(
  row: ExcelJS.Row,
  outdoorAirTempC: number,
): void {
  row.getCell(GAS_COL.outdoor).value = outdoorAirTempC;
}

export function writeGasManualFieldsOnRow(
  row: ExcelJS.Row,
  excelRow: number,
  fields: HccpGasManualFields,
): void {
  row.getCell(GAS_COL.ballroom).value = fields.ballroomUtilization;
  row.getCell(GAS_COL.dlh).value = fields.dlhOccupancy;
  row.getCell(GAS_COL.del).value = fields.delOccupancy;
  row.getCell(GAS_COL.dhh).value = fields.dhhOccupancy;
  row.getCell(GAS_COL.atten).value = fields.atten;

  setThirtyDaysFormula(row, excelRow);
  setOverallOccupancyFormula(row, excelRow);

  const overall = computeHccpOverallOccupancy(
    fields.dlhOccupancy,
    fields.delOccupancy,
    fields.dhhOccupancy,
  );
  row.getCell(GAS_COL.overall).value = {
    formula: `((D${excelRow}*400)+(E${excelRow}*750)+(F${excelRow}*600))/1750`,
    result: overall,
  };
}

export async function loadGasMeterWorkbook(
  masterWorkbookPath: string,
): Promise<ExcelJS.Workbook> {
  const buffer = await readFile(masterWorkbookPath);
  const workbook = new ExcelJS.Workbook();
  // exceljs typings declare their own Buffer (extends ArrayBuffer), not Node's Buffer.
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook;
}

export async function saveGasMeterWorkbook(
  workbook: ExcelJS.Workbook,
  masterWorkbookPath: string,
): Promise<void> {
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  await writeFile(masterWorkbookPath, buffer);
}

export function getGasMeterSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  const sheet = workbook.getWorksheet("Gas Meter Reading");
  if (!sheet) {
    throw new Error('Gas master missing sheet "Gas Meter Reading"');
  }
  return sheet;
}
