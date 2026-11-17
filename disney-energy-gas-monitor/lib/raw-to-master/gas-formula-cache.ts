import type ExcelJS from "exceljs";
import { addIsoDays } from "@/lib/hkdl-daily-report-date";
import { computeHccpOverallOccupancy } from "@/lib/raw-to-master/hccp-gas-manual";
/** Gas Meter Reading columns (Excel 1-based). Keep in sync with hccp-gas-excel. */
const COL = {
  date: 1,
  thirtyDays: 2,
  dlh: 4,
  del: 5,
  dhh: 6,
  overall: 7,
  meter1: 9,
  meter2: 10,
  gasUnits: 11,
} as const;

/** Calendar today in Hong Kong (matches typical Excel TODAY() on HKDL PCs). */
export function hkdlTodayIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" });
}

/** Same logic as Gas Meter Reading column B formula. */
export function gasThirtyDaysFormulaResult(rowIso: string): boolean {
  const today = hkdlTodayIso();
  const windowStart = addIsoDays(today, -30);
  return rowIso >= windowStart && rowIso < today;
}

function numericCellValue(value: ExcelJS.CellValue): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "result" in value) {
    const r = (value as { result: unknown }).result;
    if (typeof r === "number" && Number.isFinite(r)) return r;
  }
  return 0;
}

function isoFromDateCell(value: ExcelJS.CellValue): string | null {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const utc = Date.UTC(1899, 11, 30) + value * 86_400_000;
    return new Date(utc).toISOString().slice(0, 10);
  }
  return null;
}

/**
 * Excel Protected View shows cached <v> under <f> without recalculating.
 * Refresh formula results so column B (boolean) and K (sum) display correctly
 * before the user clicks Enable Editing.
 */
export function refreshGasMeterFormulaCaches(
  sheet: ExcelJS.Worksheet,
  firstDataRow = 2,
  lastDataRow?: number,
): void {
  const last = lastDataRow ?? sheet.rowCount;
  for (let rowNum = firstDataRow; rowNum <= last; rowNum += 1) {
    const row = sheet.getRow(rowNum);
    const rowIso = isoFromDateCell(row.getCell(COL.date).value);
    if (!rowIso) continue;

    const thirtyDays = gasThirtyDaysFormulaResult(rowIso);
    row.getCell(COL.thirtyDays).value = {
      formula: `AND(A${rowNum}>=(TODAY()-30),A${rowNum}<TODAY())`,
      result: thirtyDays,
    };

    const dlh = numericCellValue(row.getCell(COL.dlh).value);
    const del = numericCellValue(row.getCell(COL.del).value);
    const dhh = numericCellValue(row.getCell(COL.dhh).value);
    const overall = computeHccpOverallOccupancy(dlh, del, dhh);
    row.getCell(COL.overall).value = {
      formula: `((D${rowNum}*400)+(E${rowNum}*750)+(F${rowNum}*600))/1750`,
      result: overall,
    };

    const meter1 = numericCellValue(row.getCell(COL.meter1).value);
    const meter2 = numericCellValue(row.getCell(COL.meter2).value);
    row.getCell(COL.gasUnits).value = {
      formula: `I${rowNum}+J${rowNum}`,
      result: meter1 + meter2,
    };
  }
}