import Papa from "papaparse";
import {
  ensureGasMeterRow,
  getGasMeterSheet,
  loadGasMeterWorkbook,
  saveGasMeterWorkbook,
  writeGasMeterConsumption,
  writeGasManualFieldsOnRow,
  writeGasOutdoorAirTempOnRow,
} from "@/lib/raw-to-master/hccp-gas-excel";
import {
  computeHccpOverallOccupancy,
  type HccpGasManualFields,
} from "@/lib/raw-to-master/hccp-gas-manual";
import { updatePowerSolarContextColumns } from "@/lib/raw-to-master/power-solar-context";
import { POWER_SOLAR_MASTER_FILENAME } from "@/lib/raw-to-master/power-solar";
import path from "path";
import { MASTER_SHEETS_DIR } from "@/lib/master-sheets-config";
import { dailyReportDateFromEmsBatchDataDate } from "@/lib/hkdl-daily-report-date";

export const HCCP_GAS_MASTER_FILENAME = "HCCP_Gas_Consumption_report.xlsx";
export const GAS_METER_SHEET_NAME = "Gas Meter Reading";

/** Cumulative gas meter registers wrap at this value (ft³ pulse counts). */
export const HCCP_GAS_METER_WRAP = 65_536;


export interface HccpGasMidnightReading {
  meter1: number;
  meter2: number;
}

export interface HccpGasDailyConsumption {
  consumptionDate: string;
  meter1: number;
  meter2: number;
  gasConsumptionUnits: number;
}

export class HccpGasConversionError extends Error {
  constructor(
    message: string,
    readonly code:
      | "MISSING_SHEET"
      | "MISSING_MIDNIGHT"
      | "MISSING_DATE_ROW"
      | "INVALID_CSV",
  ) {
    super(message);
    this.name = "HccpGasConversionError";
  }
}

export interface HccpGasConversionInput {
  capacityCsvTexts: string[];
  masterWorkbookPath: string;
  /** ISO date of the consumption day (master row). Latest day when omitted. */
  consumptionDate?: string;
  /** Outdoor air temp (°C) from CCP+HCCP Daily1 column BY daily average. */
  outdoorAirTempC?: number | null;
}

export interface HccpGasConversionResult {
  consumptionDate: string;
  meter1: number;
  meter2: number;
  gasConsumptionUnits: number;
}

function parseHccpGasNumericCell(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim().replace(/,/g, "");
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return value;
}

/** EMS export: `M/D/YYYY H:mm:ss` (month/day/year). */
export function parseHccpGasCapacityTimestamp(
  raw: string,
): { isoDate: string; isMidnight: boolean } | null {
  const trimmed = raw.trim();
  const match = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(?:AM|PM)?$/i,
  );
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  let hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] !== undefined ? Number(match[6]) : 0;
  if (
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(year)
  ) {
    return null;
  }
  if (/PM$/i.test(trimmed) && hour < 12) hour += 12;
  if (/AM$/i.test(trimmed) && hour === 12) hour = 0;
  const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const isMidnight = hour === 0 && minute === 0 && second === 0;
  return { isoDate, isMidnight };
}

export function addIsoDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d + days);
  return new Date(utc).toISOString().slice(0, 10);
}

export function hccpGasMeterDelta(prior: number, current: number): number {
  if (current >= prior) return current - prior;
  return HCCP_GAS_METER_WRAP - prior + current;
}

/** Midnight register snapshots keyed by ISO calendar date. */
export function parseHccpGasCapacityMidnights(
  csvText: string,
): Map<string, HccpGasMidnightReading> {
  const parsed = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
  });
  if (parsed.data.length < 2) {
    throw new HccpGasConversionError(
      "HCCP Gas Capacity CSV has no data rows",
      "INVALID_CSV",
    );
  }

  const map = new Map<string, HccpGasMidnightReading>();
  for (const row of parsed.data.slice(1)) {
    const ts = parseHccpGasCapacityTimestamp(String(row[0] ?? ""));
    if (!ts?.isMidnight) continue;
    const meter1 = parseHccpGasNumericCell(row[1]);
    const meter2 = parseHccpGasNumericCell(row[2]);
    if (meter1 === null || meter2 === null) continue;
    map.set(ts.isoDate, { meter1, meter2 });
  }
  return map;
}

export function mergeHccpGasMidnightMaps(
  maps: Map<string, HccpGasMidnightReading>[],
): Map<string, HccpGasMidnightReading> {
  const merged = new Map<string, HccpGasMidnightReading>();
  for (const map of maps) {
    for (const [iso, reading] of map) {
      merged.set(iso, reading);
    }
  }
  return merged;
}

export function computeHccpGasConsumptionForDate(
  midnightByDate: Map<string, HccpGasMidnightReading>,
  consumptionDate: string,
): HccpGasDailyConsumption | null {
  const nextDate = addIsoDays(consumptionDate, 1);
  const prior = midnightByDate.get(consumptionDate);
  const current = midnightByDate.get(nextDate);
  if (!prior || !current) return null;

  const meter1 = hccpGasMeterDelta(prior.meter1, current.meter1);
  const meter2 = hccpGasMeterDelta(prior.meter2, current.meter2);
  return {
    consumptionDate,
    meter1,
    meter2,
    gasConsumptionUnits: meter1 + meter2,
  };
}

/** Gas row date = EMS batch data date (same as other masters). */
export function hccpGasConsumptionDateForEmsDataDate(
  emsBatchDataDate: string,
): string {
  return dailyReportDateFromEmsBatchDataDate(emsBatchDataDate);
}

/** Latest consumption day computable from merged midnight snapshots. */
export function latestHccpGasConsumptionDate(
  midnightByDate: Map<string, HccpGasMidnightReading>,
): string | null {
  const dates = [...midnightByDate.keys()].sort();
  if (dates.length < 2) return null;
  const newestMidnight = dates[dates.length - 1];
  const consumptionDate = addIsoDays(newestMidnight, -1);
  if (!computeHccpGasConsumptionForDate(midnightByDate, consumptionDate)) {
    return null;
  }
  return consumptionDate;
}

export async function convertHccpGasMaster(
  input: HccpGasConversionInput,
): Promise<HccpGasConversionResult> {
  const midnightMaps = input.capacityCsvTexts.map(parseHccpGasCapacityMidnights);
  const midnightByDate = mergeHccpGasMidnightMaps(midnightMaps);

  const consumptionDate =
    input.consumptionDate ?? latestHccpGasConsumptionDate(midnightByDate);
  if (!consumptionDate) {
    throw new HccpGasConversionError(
      "Could not determine consumption date (need at least two consecutive midnights)",
      "MISSING_MIDNIGHT",
    );
  }

  const consumption = computeHccpGasConsumptionForDate(
    midnightByDate,
    consumptionDate,
  );
  if (!consumption) {
    throw new HccpGasConversionError(
      `Missing midnight readings for ${consumptionDate} and ${addIsoDays(consumptionDate, 1)} (month boundary may need prior-month Capacity CSV)`,
      "MISSING_MIDNIGHT",
    );
  }

  const workbook = await loadGasMeterWorkbook(input.masterWorkbookPath);
  const sheet = getGasMeterSheet(workbook);
  const excelRow = ensureGasMeterRow(sheet, consumptionDate);
  const row = sheet.getRow(excelRow);
  writeGasMeterConsumption(row, excelRow, consumption);
  if (input.outdoorAirTempC !== undefined && input.outdoorAirTempC !== null) {
    writeGasOutdoorAirTempOnRow(row, input.outdoorAirTempC);
  }
  await saveGasMeterWorkbook(workbook, input.masterWorkbookPath);

  return {
    consumptionDate,
    meter1: consumption.meter1,
    meter2: consumption.meter2,
    gasConsumptionUnits: consumption.gasConsumptionUnits,
  };
}

export interface HccpGasManualUpdateInput {
  masterWorkbookPath: string;
  consumptionDate: string;
  fields: HccpGasManualFields;
}

export async function applyHccpGasManualFields(
  input: HccpGasManualUpdateInput,
): Promise<{ consumptionDate: string; overallOccupancy: number }> {
  const workbook = await loadGasMeterWorkbook(input.masterWorkbookPath);
  const sheet = getGasMeterSheet(workbook);
  const excelRow = ensureGasMeterRow(sheet, input.consumptionDate);
  const row = sheet.getRow(excelRow);
  writeGasManualFieldsOnRow(row, excelRow, input.fields);
  await saveGasMeterWorkbook(workbook, input.masterWorkbookPath);
  const overall = computeHccpOverallOccupancy(
    input.fields.dlhOccupancy,
    input.fields.delOccupancy,
    input.fields.dhhOccupancy,
  );

  const powerSolarPath = path.join(
    MASTER_SHEETS_DIR,
    POWER_SOLAR_MASTER_FILENAME,
  );
  try {
    await updatePowerSolarContextColumns(powerSolarPath, {
      dataDate: input.consumptionDate,
      overallOccupancy: overall,
      atten: input.fields.atten,
    });
  } catch {
    // Power Solar master may be absent on partial hosts; gas save still succeeds.
  }

  return { consumptionDate: input.consumptionDate, overallOccupancy: overall };
}
