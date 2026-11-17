import ExcelJS from "exceljs";
import {
  loadExcelWorkbook,
  saveExcelWorkbook,
} from "@/lib/raw-to-master/exceljs-preserve";
import { queueTableRangePatch } from "@/lib/raw-to-master/exceljs-table-xml-preserve";
import { excelSerialToDate } from "@/lib/datastore/parsers/excel-utils";
import { setExcelDateCellValue } from "@/lib/raw-to-master/excel-date";
import {
  computeHccpOverallOccupancy,
  type HccpGasManualFields,
} from "@/lib/raw-to-master/hccp-gas-manual";
import type { HccpGasDailyConsumption } from "@/lib/raw-to-master/hccp-gas";
import {
  gasThirtyDaysFormulaResult,
  refreshGasMeterFormulaCaches,
} from "@/lib/raw-to-master/gas-formula-cache";

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

function setThirtyDaysFormula(row: ExcelJS.Row, excelRow: number): void {
  const rowIso = isoFromCellValue(row.getCell(GAS_COL.date).value);
  const result = rowIso ? gasThirtyDaysFormulaResult(rowIso) : false;
  row.getCell(GAS_COL.thirtyDays).value = {
    formula: `AND(A${excelRow}>=(TODAY()-30),A${excelRow}<TODAY())`,
    result,
  };
}

function setOverallOccupancyFormula(row: ExcelJS.Row, excelRow: number): void {
  const dlh = Number(row.getCell(GAS_COL.dlh).value) || 0;
  const del = Number(row.getCell(GAS_COL.del).value) || 0;
  const dhh = Number(row.getCell(GAS_COL.dhh).value) || 0;
  row.getCell(GAS_COL.overall).value = {
    formula: `((D${excelRow}*400)+(E${excelRow}*750)+(F${excelRow}*600))/1750`,
    result: ((dlh * 400) + (del * 750) + (dhh * 600)) / 1750,
  };
}

function setGasUnitsFormula(row: ExcelJS.Row, excelRow: number): void {
  const meter1 = Number(row.getCell(GAS_COL.meter1).value) || 0;
  const meter2 = Number(row.getCell(GAS_COL.meter2).value) || 0;
  row.getCell(GAS_COL.gasUnits).value = {
    formula: `I${excelRow}+J${excelRow}`,
    result: meter1 + meter2,
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

/** Queue a table XML range patch (applied on save; never Table#commit). */
export function syncGasMeterTableRange(
  masterWorkbookPath: string,
  lastDataRow: number,
): void {
  queueTableRangePatch(masterWorkbookPath, "table1.xml", `A1:K${lastDataRow}`);
}

export function findLastGasMeterDatedRow(sheet: ExcelJS.Worksheet): number | null {
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
  masterWorkbookPath: string,
): number {
  const existing = findGasMeterRowByDate(sheet, isoDate);
  if (existing !== null) return existing;

  const templateRowNumber = findLastGasMeterDatedRow(sheet);
  if (templateRowNumber === null) {
    throw new Error("Gas Meter Reading has no template data rows");
  }

  const insertAt = templateRowNumber + 1;
  sheet.spliceRows(insertAt, 0, []);
  const templateRow = sheet.getRow(templateRowNumber);
  const newRow = sheet.getRow(insertAt);
  if (templateRow.height) newRow.height = templateRow.height;

  setExcelDateCellValue(
    newRow.getCell(GAS_COL.date),
    isoDate,
    templateRow.getCell(GAS_COL.date),
  );

  setThirtyDaysFormula(newRow, insertAt);
  setOverallOccupancyFormula(newRow, insertAt);
  setGasUnitsFormula(newRow, insertAt);

  const lastRow = findLastGasMeterDatedRow(sheet) ?? insertAt;
  syncGasMeterTableRange(masterWorkbookPath, lastRow);

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

export const GAS_METER_SHEET = "Gas Meter Reading";

export const loadGasMeterWorkbook = loadExcelWorkbook;

export async function saveGasMeterWorkbook(
  workbook: ExcelJS.Workbook,
  masterWorkbookPath: string,
): Promise<void> {
  const sheet = getGasMeterSheet(workbook);
  const lastRow = findLastGasMeterDatedRow(sheet);
  if (lastRow !== null) {
    refreshGasMeterFormulaCaches(sheet, 2, lastRow);
    syncGasMeterTableRange(masterWorkbookPath, lastRow);
  }
  workbook.calcProperties.fullCalcOnLoad = true;
  await saveExcelWorkbook(workbook, masterWorkbookPath, [GAS_METER_SHEET]);
}

export function getGasMeterSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  const sheet = workbook.getWorksheet("Gas Meter Reading");
  if (!sheet) {
    throw new Error('Gas master missing sheet "Gas Meter Reading"');
  }
  return sheet;
}
