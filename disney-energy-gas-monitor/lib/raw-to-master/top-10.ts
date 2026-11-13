import { readFile } from "fs/promises";
import { getTop10RawDataRows } from "@/lib/raw-to-master/load-top-10-rawdata-rows";
import {
  loadExcelWorkbook,
  saveExcelWorkbook,
} from "@/lib/raw-to-master/exceljs-preserve";
import {
  appendWebSsDateColumnExcel,
  buildWebSsRowIndexExcel,
  findWebSsDateColumnExcel,
  getWebSsSheet,
  resolveWebSsRowExcel,
  WEBSS_DATE_HEADER_ROW,
  WEBSS_FIRST_DATE_COL,
} from "@/lib/raw-to-master/top-10-excel";
import {
  csvColumnDailyAverage,
  csvColumnDailyDeltaKwh,
} from "@/lib/raw-to-master/csv-column-delta";
import { FeedInTariffLookup } from "@/lib/raw-to-master/feed-in-tariff-lookup";
import { logicalIdForTop10Link } from "@/lib/raw-to-master/top-10-link-map";
import { normalizeTop10Location } from "@/lib/raw-to-master/top-10-webss";

import { outdoorAirTempFromDaily1Csv } from "@/lib/raw-to-master/outdoor-air-temp";
import {
  SUM_CCP1_SUBTRAHEND_RAW_DATA_ROW,
  SUM_CCP1_SUMMAND_RAW_DATA_ROWS,
} from "@/lib/raw-to-master/top-10-sum-ccp1";

export const TOP10_MASTER_FILENAME = "HKDL_Top_10.xlsx";

export interface Top10ConversionInput {
  dataDate: string;
  rawCsvByLogicalId: Record<string, string>;
  masterWorkbookPath: string;
  feedInTariffPath: string;
  replaceExisting?: boolean;
}

export interface Top10ConversionResult {
  dataDate: string;
  metersWritten: number;
  outdoorTempWritten: boolean;
}

export class Top10ConversionError extends Error {
  constructor(
    message: string,
    readonly code:
      | "DUPLICATE_DATE"
      | "MISSING_WEBSS_ROW"
      | "MISSING_RAW"
      | "FEED_IN_DATE",
  ) {
    super(message);
    this.name = "Top10ConversionError";
  }
}

type RawRow = ReturnType<typeof getTop10RawDataRows>[number];

function resolveCsv(
  rawCsvByLogicalId: Record<string, string>,
  linkId: number,
): string {
  const logicalId = logicalIdForTop10Link(linkId);
  const csv = rawCsvByLogicalId[logicalId];
  if (!csv) {
    throw new Top10ConversionError(
      `Missing raw CSV for Top_10 link ${linkId} (${logicalId})`,
      "MISSING_RAW",
    );
  }
  return csv;
}

function computeRowKwh(
  row: RawRow,
  dataDate: string,
  rawCsvByLogicalId: Record<string, string>,
  feedIn: FeedInTariffLookup,
  computedByRawDataRow: Map<number, number>,
): number | null {
  if (row.kind === "skip") return null;

  if (row.kind === "aggregate300") {
    let sum = 0;
    for (const excelRow of SUM_CCP1_SUMMAND_RAW_DATA_ROWS) {
      const v = computedByRawDataRow.get(excelRow);
      if (v === undefined) {
        throw new Top10ConversionError(
          `Row 300 aggregate missing computed value for RawData row ${excelRow}`,
          "MISSING_RAW",
        );
      }
      sum += v;
    }
    const sub = computedByRawDataRow.get(SUM_CCP1_SUBTRAHEND_RAW_DATA_ROW);
    if (sub === undefined) {
      throw new Top10ConversionError(
        `Row 300 aggregate missing computed value for RawData row ${SUM_CCP1_SUBTRAHEND_RAW_DATA_ROW}`,
        "MISSING_RAW",
      );
    }
    return sum - sub;
  }

  if (!row.importRef) return null;

  const csv = resolveCsv(rawCsvByLogicalId, row.importRef.link);
  const importDelta = csvColumnDailyDeltaKwh(csv, row.importRef.col);
  if (importDelta === null) return null;

  if (row.kind === "plain") {
    return importDelta;
  }

  if (row.kind === "solar") {
    let recDelta = 0;
    if (row.recRef) {
      const recCsv = resolveCsv(rawCsvByLogicalId, row.recRef.link);
      const rec = csvColumnDailyDeltaKwh(recCsv, row.recRef.col);
      if (rec !== null) recDelta = rec;
    }
    const feedInSum = feedIn.sumFeedInForColumns(
      dataDate,
      row.feedInTariffColumns,
    );
    return importDelta - recDelta + feedInSum;
  }

  return null;
}

function computeOutdoorTempC(
  rawCsvByLogicalId: Record<string, string>,
): number | null {
  return outdoorAirTempFromDaily1Csv(rawCsvByLogicalId);
}

export async function convertTop10Master(
  input: Top10ConversionInput,
): Promise<Top10ConversionResult> {
  const rawDataRows = getTop10RawDataRows();
  const hasSolar = rawDataRows.some(
    (r) => r.kind === "solar" && r.feedInTariffColumns.length > 0,
  );
  const feedInBuffer = await readFile(input.feedInTariffPath);
  const feedIn = FeedInTariffLookup.fromBuffer(feedInBuffer);
  if (hasSolar) {
    try {
      feedIn.requireDataDate(input.dataDate);
    } catch {
      throw new Top10ConversionError(
        `Feed-in tariff report has no row for data date ${input.dataDate}`,
        "FEED_IN_DATE",
      );
    }
  }

  const workbook = await loadExcelWorkbook(input.masterWorkbookPath);
  const sheet = getWebSsSheet(workbook);

  let dateCol = findWebSsDateColumnExcel(sheet, input.dataDate);
  if (dateCol !== null && !input.replaceExisting) {
    throw new Top10ConversionError(
      `Top_10 already has data for ${input.dataDate}`,
      "DUPLICATE_DATE",
    );
  }
  if (dateCol === null) {
    dateCol = appendWebSsDateColumnExcel(sheet, input.dataDate);
  }

  const rowIndex = buildWebSsRowIndexExcel(sheet);
  const templateCol =
    dateCol > WEBSS_FIRST_DATE_COL ? dateCol - 1 : dateCol;
  const prevFmt = sheet
    .getRow(WEBSS_DATE_HEADER_ROW)
    .getCell(templateCol).numFmt;
  const computedByRawDataRow = new Map<number, number>();
  const pendingWrites: Array<{ row: RawRow; value: number }> = [];

  for (const row of rawDataRows) {
    if (row.meter === "Outdoor Air Temperature") continue;
    const value = computeRowKwh(
      row,
      input.dataDate,
      input.rawCsvByLogicalId,
      feedIn,
      computedByRawDataRow,
    );
    if (value === null) continue;
    computedByRawDataRow.set(row.rawDataRow, value);
    if (row.kind === "aggregate300") {
      pendingWrites.push({ row, value });
      continue;
    }
    if (row.kind === "plain" || row.kind === "solar") {
      pendingWrites.push({ row, value });
    }
  }

  const missingRows: string[] = [];
  let metersWritten = 0;

  for (const { row, value } of pendingWrites) {
    const webRow = resolveWebSsRowExcel(rowIndex, row.meter, row.location);
    if (webRow === null) {
      missingRows.push(
        `${row.meter} @ ${normalizeTop10Location(row.location)}`,
      );
      continue;
    }
    const cell = sheet.getRow(webRow).getCell(dateCol);
    const templateCell = sheet.getRow(webRow).getCell(templateCol);
    cell.value = value;
    if (templateCell.style && Object.keys(templateCell.style).length > 0) {
      cell.style = JSON.parse(JSON.stringify(templateCell.style));
    }
    if (templateCell.numFmt) {
      cell.numFmt = templateCell.numFmt;
    } else if (prevFmt) {
      cell.numFmt = prevFmt;
    }
    metersWritten += 1;
  }

  if (missingRows.length > 0) {
    throw new Top10ConversionError(
      `Top_10 WebSS_Data missing meter/location row(s): ${missingRows.slice(0, 8).join("; ")}${missingRows.length > 8 ? ` (+${missingRows.length - 8} more)` : ""}`,
      "MISSING_WEBSS_ROW",
    );
  }

  let outdoorTempWritten = false;
  const outdoorRow = rawDataRows.find(
    (r) => r.meter === "Outdoor Air Temperature",
  );
  const outdoorAvg = computeOutdoorTempC(input.rawCsvByLogicalId);
  if (outdoorRow && outdoorAvg !== null) {
    const webRow = resolveWebSsRowExcel(
      rowIndex,
      outdoorRow.meter,
      outdoorRow.location,
    );
    if (webRow !== null) {
      const cell = sheet.getRow(webRow).getCell(dateCol);
      const templateCell = sheet.getRow(webRow).getCell(templateCol);
      cell.value = outdoorAvg;
      if (templateCell.style && Object.keys(templateCell.style).length > 0) {
        cell.style = JSON.parse(JSON.stringify(templateCell.style));
      }
      if (templateCell.numFmt) cell.numFmt = templateCell.numFmt;
      outdoorTempWritten = true;
      metersWritten += 1;
    }
  }

  await saveExcelWorkbook(workbook, input.masterWorkbookPath);

  return {
    dataDate: input.dataDate,
    metersWritten,
    outdoorTempWritten,
  };
}
