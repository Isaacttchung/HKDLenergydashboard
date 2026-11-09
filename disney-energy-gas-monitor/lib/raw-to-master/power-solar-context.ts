import { readFile, writeFile } from "fs/promises";
import * as XLSX from "xlsx";
import {
  excelSerialMatchesIsoDate,
  isoDateToExcelSerial,
} from "@/lib/raw-to-master/excel-date";
import {
  POWER_SOLAR_SHEET_CONFIG,
  type PowerSolarArea,
} from "@/lib/raw-to-master/power-solar-mappings";

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
  const buffer = await readFile(masterWorkbookPath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });

  let hotelRow: number | null = null;
  let parkRow: number | null = null;

  const hotelSheet = workbook.Sheets.Hotel;
  if (hotelSheet) {
    const cfg = POWER_SOLAR_SHEET_CONFIG.Hotel;
    const firstData = cfg.headerRowIndex + 1;
    let row = findDateRow(hotelSheet, update.dataDate, firstData);
    if (row === null) row = appendDateRow(hotelSheet, update.dataDate);
    hotelRow = row;
    writeHotelContextFormulas(hotelSheet, row);
    if (update.overallOccupancy != null) {
      setNumber(hotelSheet, row, PS_HOTEL_COL.occupancy, update.overallOccupancy);
    }
  }

  const parkSheet = workbook.Sheets.Park;
  if (parkSheet) {
    const cfg = POWER_SOLAR_SHEET_CONFIG.Park;
    const firstData = cfg.headerRowIndex + 1;
    let row = findDateRow(parkSheet, update.dataDate, firstData);
    if (row === null) row = appendDateRow(parkSheet, update.dataDate);
    parkRow = row;
    const atten = update.atten ?? Number(parkSheet[XLSX.utils.encode_cell({ r: row, c: PS_PARK_COL.attendance })]?.v) ?? 0;
    if (update.atten != null) {
      setNumber(parkSheet, row, PS_PARK_COL.attendance, update.atten);
    }
    if (update.outdoorAirTempC != null) {
      setNumber(parkSheet, row, PS_PARK_COL.temperature, update.outdoorAirTempC);
    }
    writeParkContextFormulas(parkSheet, row, update.atten ?? atten);
  }

  const out = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  await writeFile(masterWorkbookPath, out);

  return { hotelRow, parkRow };
}
