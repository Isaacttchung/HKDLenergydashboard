import { readFile, writeFile } from "fs/promises";
import * as XLSX from "xlsx";
import {
  normalizeHeader,
  excelSerialToDate,
} from "@/lib/datastore/parsers/excel-utils";
import { csvColumnDailyDeltaKwh } from "@/lib/raw-to-master/csv-column-delta";
import { FeedInTariffLookup } from "@/lib/raw-to-master/feed-in-tariff-lookup";
import {
  excelSerialMatchesIsoDate,
  isoDateToExcelSerial,
} from "@/lib/raw-to-master/excel-date";
import { outdoorAirTempFromDaily1Csv } from "@/lib/raw-to-master/outdoor-air-temp";
import {
  writeHotelContextFormulas,
  writeParkContextFormulas,
  PS_PARK_COL,
} from "@/lib/raw-to-master/power-solar-context";
import {
  HOTEL_PROPERTY_SUBTOTALS,
  MERCURY_RAW_LOGICAL_IDS,
  POWER_SOLAR_AREA_TOTAL_EXCLUDE_HEADERS,
  POWER_SOLAR_AREA_TOTAL_HEADERS,
  POWER_SOLAR_METER_MAPPINGS,
  POWER_SOLAR_SHEET_CONFIG,
  type PowerSolarArea,
  type MercuryRawLogicalId,
} from "@/lib/raw-to-master/power-solar-mappings";

export const POWER_SOLAR_MASTER_FILENAME =
  "HKDL_Power_Solar_consumption_report.xlsx";

export interface PowerSolarConversionInput {
  dataDate: string;
  rawCsvByLogicalId: Record<string, string>;
  masterWorkbookPath: string;
  feedInTariffPath: string;
}

export interface PowerSolarConversionResult {
  dataDate: string;
  metersWritten: number;
  areasUpdated: PowerSolarArea[];
}

function buildHeaderColumnMap(
  sheet: XLSX.WorkSheet,
  headerRowIndex: number,
): Map<string, number> {
  const map = new Map<string, number>();
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  for (let col = range.s.c; col <= range.e.c; col += 1) {
    const addr = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
    const cell = sheet[addr];
    if (!cell?.v) continue;
    map.set(normalizeHeader(String(cell.v)), col);
  }
  return map;
}

function findDateRow(
  sheet: XLSX.WorkSheet,
  dataDate: string,
  firstDataRowIndex: number,
): number | null {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  for (let row = firstDataRowIndex; row <= range.e.r; row += 1) {
    const addr = XLSX.utils.encode_cell({ r: row, c: 0 });
    const cell = sheet[addr];
    if (!cell) continue;
    if (excelSerialMatchesIsoDate(cell.v, dataDate)) {
      return row;
    }
  }
  return null;
}

function appendDateRow(sheet: XLSX.WorkSheet, dataDate: string): number {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  const newRow = range.e.r + 1;
  const serial = isoDateToExcelSerial(dataDate);
  sheet[XLSX.utils.encode_cell({ r: newRow, c: 0 })] = { t: "n", v: serial };
  sheet["!ref"] = XLSX.utils.encode_range({
    s: range.s,
    e: { r: newRow, c: Math.max(range.e.c, 0) },
  });
  return newRow;
}

function setNumericCell(
  sheet: XLSX.WorkSheet,
  row: number,
  col: number,
  value: number,
): void {
  sheet[XLSX.utils.encode_cell({ r: row, c: col })] = { t: "n", v: value };
}

function computeMeterValues(
  dataDate: string,
  rawCsvByLogicalId: Record<string, string>,
  feedIn: FeedInTariffLookup,
): Map<string, number> {
  const values = new Map<string, number>();
  const needsFeedIn = POWER_SOLAR_METER_MAPPINGS.some(
    (m) => m.feedInTariffColumns.length > 0,
  );
  if (needsFeedIn) {
    feedIn.requireDataDate(dataDate);
  }

  for (const mapping of POWER_SOLAR_METER_MAPPINGS) {
    const csv = rawCsvByLogicalId[mapping.rawLogicalId];
    if (!csv) continue;
    const importDelta = csvColumnDailyDeltaKwh(csv, mapping.rawColumnLetter);
    if (importDelta === null) continue;

    const feedInSum = feedIn.sumFeedInForColumns(
      dataDate,
      mapping.feedInTariffColumns,
    );
    const masterKwh = importDelta + feedInSum;
    const key = `${mapping.area}::${mapping.masterColumnHeader}`;
    values.set(key, masterKwh);
  }
  return values;
}

function requireMercuryRaws(
  rawCsvByLogicalId: Record<string, string>,
): MercuryRawLogicalId[] {
  return MERCURY_RAW_LOGICAL_IDS.filter((id) => !rawCsvByLogicalId[id]);
}

export function isExcludedFromAreaTotal(
  area: PowerSolarArea,
  masterColumnHeader: string,
): boolean {
  return (POWER_SOLAR_AREA_TOTAL_EXCLUDE_HEADERS[area] ?? []).some(
    (h) => normalizeHeader(h) === normalizeHeader(masterColumnHeader),
  );
}

/**
 * Area total column on the master (Oscar Nov 2026):
 * Σ(meters except EA8/CSB) − that excluded meter once (e.g. HCCP: 738+1352+5518−608).
 */
export function computePowerSolarAreaTotal(
  area: PowerSolarArea,
  meterValues: Map<string, number>,
): number {
  let includedSum = 0;
  let excludedSum = 0;
  for (const mapping of POWER_SOLAR_METER_MAPPINGS.filter(
    (m) => m.area === area,
  )) {
    const value = meterValues.get(
      `${mapping.area}::${mapping.masterColumnHeader}`,
    );
    if (value === undefined) continue;
    if (isExcludedFromAreaTotal(area, mapping.masterColumnHeader)) {
      excludedSum += value;
    } else {
      includedSum += value;
    }
  }
  return includedSum - excludedSum;
}

/**
 * Update CCP / HCCP / Hotel / Park detail sheets for `dataDate` from Mercury raw CSVs
 * and uploaded feed-in tariff report (CHHP Solar Consumption = import Δ + feed-in sum).
 */
export async function convertPowerSolarMaster(
  input: PowerSolarConversionInput,
): Promise<PowerSolarConversionResult> {
  const missing = requireMercuryRaws(input.rawCsvByLogicalId);
  if (missing.length > 0) {
    throw new Error(
      `Power_Solar conversion missing Mercury raw CSV(s): ${missing.join(", ")}`,
    );
  }

  const feedInBuffer = await readFile(input.feedInTariffPath);
  const feedIn = FeedInTariffLookup.fromBuffer(feedInBuffer);

  const buffer = await readFile(input.masterWorkbookPath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const meterValues = computeMeterValues(
    input.dataDate,
    input.rawCsvByLogicalId,
    feedIn,
  );
  const areasUpdated = new Set<PowerSolarArea>();
  let metersWritten = 0;

  for (const area of ["CCP", "HCCP", "Hotel", "Park"] as PowerSolarArea[]) {
    const config = POWER_SOLAR_SHEET_CONFIG[area];
    const sheet = workbook.Sheets[config.sheetName];
    if (!sheet) {
      throw new Error(
        `Power_Solar master missing sheet "${config.sheetName}"`,
      );
    }

    const headerMap = buildHeaderColumnMap(sheet, config.headerRowIndex);
    const firstDataRow = config.headerRowIndex + 1;
    let dataRow = findDateRow(sheet, input.dataDate, firstDataRow);
    if (dataRow === null) {
      dataRow = appendDateRow(sheet, input.dataDate);
    }

    let wroteInArea = false;

    for (const mapping of POWER_SOLAR_METER_MAPPINGS.filter(
      (m) => m.area === area,
    )) {
      const key = `${mapping.area}::${mapping.masterColumnHeader}`;
      const value = meterValues.get(key);
      if (value === undefined) continue;

      const col = headerMap.get(normalizeHeader(mapping.masterColumnHeader));
      if (col === undefined) {
        throw new Error(
          `Power_Solar column not found: ${config.sheetName} → "${mapping.masterColumnHeader}"`,
        );
      }

      setNumericCell(sheet, dataRow, col, value);
      metersWritten += 1;
      wroteInArea = true;
    }

    const areaSum = computePowerSolarAreaTotal(area, meterValues);

    if (area === "Hotel" && wroteInArea) {
      for (const group of HOTEL_PROPERTY_SUBTOTALS) {
        let subtotal = 0;
        for (const meterHeader of group.meterHeaders) {
          const key = `Hotel::${meterHeader}`;
          const v = meterValues.get(key);
          if (v !== undefined) subtotal += v;
        }
        const subCol = headerMap.get(normalizeHeader(group.subtotalHeader));
        if (subCol !== undefined) {
          setNumericCell(sheet, dataRow, subCol, subtotal);
        }
      }
    }

    const totalHeader = POWER_SOLAR_AREA_TOTAL_HEADERS[area];
    const totalCol = headerMap.get(normalizeHeader(totalHeader));
    if (totalCol !== undefined && wroteInArea) {
      setNumericCell(sheet, dataRow, totalCol, areaSum);
    }

    if (area === "Hotel" && wroteInArea) {
      writeHotelContextFormulas(sheet, dataRow);
    }

    if (area === "Park" && wroteInArea) {
      const outdoor = outdoorAirTempFromDaily1Csv(input.rawCsvByLogicalId);
      if (outdoor !== null) {
        setNumericCell(sheet, dataRow, PS_PARK_COL.temperature, outdoor);
      }
      const attenCell =
        sheet[
          XLSX.utils.encode_cell({
            r: dataRow,
            c: PS_PARK_COL.attendance,
          })
        ];
      const atten = Number(attenCell?.v);
      writeParkContextFormulas(
        sheet,
        dataRow,
        Number.isFinite(atten) ? atten : 0,
      );
    }

    if (wroteInArea) areasUpdated.add(area);
  }

  const out = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  await writeFile(input.masterWorkbookPath, out);

  return {
    dataDate: input.dataDate,
    metersWritten,
    areasUpdated: [...areasUpdated],
  };
}

/** Read-back helper for tests. */
export function readPowerSolarMeterValue(
  workbook: XLSX.WorkBook,
  area: PowerSolarArea,
  dataDate: string,
  masterColumnHeader: string,
): number | null {
  const config = POWER_SOLAR_SHEET_CONFIG[area];
  const sheet = workbook.Sheets[config.sheetName];
  if (!sheet) return null;
  const headerMap = buildHeaderColumnMap(sheet, config.headerRowIndex);
  const col = headerMap.get(normalizeHeader(masterColumnHeader));
  if (col === undefined) return null;
  const row = findDateRow(sheet, dataDate, config.headerRowIndex + 1);
  if (row === null) return null;
  const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
  if (!cell || cell.v === undefined || cell.v === "") return null;
  const n = Number(cell.v);
  return Number.isFinite(n) ? n : null;
}

export { excelSerialToDate };
