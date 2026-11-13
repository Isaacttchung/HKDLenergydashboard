import type ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import {
  excelSerialMatchesIsoDate,
  isoDateToExcelSerial,
} from "@/lib/raw-to-master/excel-date";
import {
  loadExcelWorkbook,
  saveExcelWorkbook,
} from "@/lib/raw-to-master/exceljs-preserve";
import {
  ensurePowerSolarDateRow,
  getPowerSolarSheet,
  setNumericCellExcel,
} from "@/lib/raw-to-master/power-solar-excel";
import { POWER_SOLAR_SHEET_CONFIG } from "@/lib/raw-to-master/power-solar-mappings";

/** 0-based column indices on Hotel / Park daily rows. */
export const PS_HOTEL_COL = { occupancy: 14, thirtyDays: 15 } as const;
export const PS_PARK_COL = {
  temperature: 24,
  attendance: 25,
  remarks: 26,
  thirtyDays: 27,
} as const;

function findDateRow(
  sheet: XLSX.WorkSheet,
  isoDate: string,
  firstDataRowIndex: number,
): number | null {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  for (let row = firstDataRowIndex; row <= range.e.r; row += 1) {
    const addr = XLSX.utils.encode_cell({ r: row, c: 0 });
    const cell = sheet[addr];
    if (!cell) continue;
    if (excelSerialMatchesIsoDate(cell.v, isoDate)) return row;
  }
  return null;
}

function appendDateRow(sheet: XLSX.WorkSheet, isoDate: string): number {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  const newRow = range.e.r + 1;
  const serial = isoDateToExcelSerial(isoDate);
  sheet[XLSX.utils.encode_cell({ r: newRow, c: 0 })] = { t: "n", v: serial };
  sheet["!ref"] = XLSX.utils.encode_range({
    s: range.s,
    e: { r: newRow, c: Math.max(range.e.c, PS_PARK_COL.thirtyDays) },
  });
  return newRow;
}

function setFormula(
  sheet: XLSX.WorkSheet,
  row: number,
  col: number,
  formula: string,
  value: number | string | boolean,
): void {
  const t =
    typeof value === "boolean" ? "b" : typeof value === "number" ? "n" : "s";
  sheet[XLSX.utils.encode_cell({ r: row, c: col })] = {
    t,
    f: formula,
    v: value,
  };
}

function setNumber(
  sheet: XLSX.WorkSheet,
  row: number,
  col: number,
  value: number,
): void {
  sheet[XLSX.utils.encode_cell({ r: row, c: col })] = { t: "n", v: value };
}

export function writeHotelContextFormulas(
  sheet: XLSX.WorkSheet,
  dataRow: number,
): void {
  const excelRow = dataRow + 1;
  setFormula(
    sheet,
    dataRow,
    PS_HOTEL_COL.thirtyDays,
    `AND(A${excelRow}>=(TODAY()-30),A${excelRow}<TODAY())`,
    true,
  );
}

export function writeParkContextFormulas(
  sheet: XLSX.WorkSheet,
  dataRow: number,
  attendance: number,
): void {
  const excelRow = dataRow + 1;
  setFormula(
    sheet,
    dataRow,
    PS_PARK_COL.thirtyDays,
    `AND(A${excelRow}>=(TODAY()-30),A${excelRow}<TODAY())`,
    true,
  );
  setFormula(
    sheet,
    dataRow,
    PS_PARK_COL.remarks,
    `IF(Z${excelRow}=0,"CLOSE","OPEN")`,
    attendance === 0 ? "CLOSE" : "OPEN",
  );
}

export function writeHotelContextFormulasExcel(
  sheet: ExcelJS.Worksheet,
  dataRow: number,
): void {
  sheet.getRow(dataRow).getCell(PS_HOTEL_COL.thirtyDays + 1).value = {
    formula: `AND(A${dataRow}>=(TODAY()-30),A${dataRow}<TODAY())`,
    result: true,
  };
}

export function writeParkContextFormulasExcel(
  sheet: ExcelJS.Worksheet,
  dataRow: number,
  attendance: number,
): void {
  sheet.getRow(dataRow).getCell(PS_PARK_COL.thirtyDays + 1).value = {
    formula: `AND(A${dataRow}>=(TODAY()-30),A${dataRow}<TODAY())`,
    result: true,
  };
  sheet.getRow(dataRow).getCell(PS_PARK_COL.remarks + 1).value = {
    formula: `IF(Z${dataRow}=0,"CLOSE","OPEN")`,
    result: attendance === 0 ? "CLOSE" : "OPEN",
  };
}

export interface PowerSolarContextUpdate {
  dataDate: string;
  outdoorAirTempC?: number | null;
  overallOccupancy?: number | null;
  atten?: number | null;
}

/**
 * Hotel O (occupancy), Park Y/Z, plus formula columns P / AA / AB for `dataDate`.
 * Occupancy and Atten usually come from the gas manual step; outdoor temp from EMS Daily1 on raw upload.
 */
export async function updatePowerSolarContextColumns(
  masterWorkbookPath: string,
  update: PowerSolarContextUpdate,
): Promise<{ hotelRow: number | null; parkRow: number | null }> {
  const workbook = await loadExcelWorkbook(masterWorkbookPath);

  let hotelRow: number | null = null;
  let parkRow: number | null = null;

  try {
    const hotelSheet = getPowerSolarSheet(workbook, "Hotel");
    const cfg = POWER_SOLAR_SHEET_CONFIG.Hotel;
    const firstData = cfg.headerRowIndex + 1;
    const row = ensurePowerSolarDateRow(hotelSheet, update.dataDate, firstData);
    hotelRow = row;
    writeHotelContextFormulasExcel(hotelSheet, row);
    if (update.overallOccupancy != null) {
      setNumericCellExcel(
        hotelSheet,
        row,
        PS_HOTEL_COL.occupancy + 1,
        update.overallOccupancy,
      );
    }
  } catch {
  }

  try {
    const parkSheet = getPowerSolarSheet(workbook, "Park");
    const cfg = POWER_SOLAR_SHEET_CONFIG.Park;
    const firstData = cfg.headerRowIndex + 1;
    const row = ensurePowerSolarDateRow(parkSheet, update.dataDate, firstData);
    parkRow = row;
    const attenCell = parkSheet.getRow(row).getCell(PS_PARK_COL.attendance + 1).value;
    const atten = update.atten ?? Number(attenCell) ?? 0;
    if (update.atten != null) {
      setNumericCellExcel(
        parkSheet,
        row,
        PS_PARK_COL.attendance + 1,
        update.atten,
      );
    }
    if (update.outdoorAirTempC != null) {
      setNumericCellExcel(
        parkSheet,
        row,
        PS_PARK_COL.temperature + 1,
        update.outdoorAirTempC,
      );
    }
    writeParkContextFormulasExcel(parkSheet, row, update.atten ?? atten);
  } catch {
  }

  await saveExcelWorkbook(workbook, masterWorkbookPath);

  return { hotelRow, parkRow };
}
