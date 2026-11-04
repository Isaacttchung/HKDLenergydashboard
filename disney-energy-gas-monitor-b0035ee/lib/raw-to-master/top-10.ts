import { readFile, writeFile } from "fs/promises";
import * as XLSX from "xlsx";
import rawDataRows from "@/lib/raw-to-master/top-10-rawdata-rows.json";
import {
  csvColumnDailyAverage,
  csvColumnDailyDeltaKwh,
} from "@/lib/raw-to-master/csv-column-delta";
import { FeedInTariffLookup } from "@/lib/raw-to-master/feed-in-tariff-lookup";
import { logicalIdForTop10Link } from "@/lib/raw-to-master/top-10-link-map";
import {
  appendWebSsDateColumn,
  buildWebSsRowIndex,
  findWebSsDateColumn,
  normalizeTop10Location,
  resolveWebSsRow,
  WEBSS_SHEET_NAME,
} from "@/lib/raw-to-master/top-10-webss";

export const TOP10_MASTER_FILENAME = "HKDL_Top_10.xlsx";

const OUTDOOR_TEMP_RAW_LOGICAL_ID = "CCP+HCCP_Daily1";
const OUTDOOR_TEMP_COLUMN = "BY";

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

type RawRow = (typeof rawDataRows)[number];

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
    for (let excelRow = 147; excelRow <= 152; excelRow += 1) {
      const v = computedByRawDataRow.get(excelRow);
      if (v === undefined) {
        throw new Top10ConversionError(
          `Row 300 aggregate missing computed value for RawData row ${excelRow}`,
          "MISSING_RAW",
        );
      }
      sum += v;
    }
    const sub = computedByRawDataRow.get(153);
    if (sub === undefined) {
      throw new Top10ConversionError(
        "Row 300 aggregate missing computed value for RawData row 153",
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
  const csv = rawCsvByLogicalId[OUTDOOR_TEMP_RAW_LOGICAL_ID];
  if (!csv) return null;
  return csvColumnDailyAverage(csv, OUTDOOR_TEMP_COLUMN);
}

export async function convertTop10Master(
  input: Top10ConversionInput,
): Promise<Top10ConversionResult> {
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

  const buffer = await readFile(input.masterWorkbookPath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets[WEBSS_SHEET_NAME];
  if (!sheet) {
    throw new Top10ConversionError(
      `Top_10 master missing sheet "${WEBSS_SHEET_NAME}"`,
      "MISSING_RAW",
    );
  }

  let dateCol = findWebSsDateColumn(sheet, input.dataDate);
  if (dateCol !== null && !input.replaceExisting) {
    throw new Top10ConversionError(
      `Top_10 already has data for ${input.dataDate}`,
      "DUPLICATE_DATE",
    );
  }
  if (dateCol === null) {
    dateCol = appendWebSsDateColumn(sheet, input.dataDate);
  }

  const rowIndex = buildWebSsRowIndex(sheet);
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
    const webRow = resolveWebSsRow(rowIndex, row.meter, row.location);
    if (webRow === null) {
      missingRows.push(
        `${row.meter} @ ${normalizeTop10Location(row.location)}`,
      );
      continue;
    }
    sheet[XLSX.utils.encode_cell({ r: webRow, c: dateCol })] = {
      t: "n",
      v: value,
    };
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
    const webRow = resolveWebSsRow(
      rowIndex,
      outdoorRow.meter,
      outdoorRow.location,
    );
    if (webRow !== null) {
      sheet[XLSX.utils.encode_cell({ r: webRow, c: dateCol })] = {
        t: "n",
        v: outdoorAvg,
      };
      outdoorTempWritten = true;
      metersWritten += 1;
    }
  }

  const out = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  await writeFile(input.masterWorkbookPath, out);

  return {
    dataDate: input.dataDate,
    metersWritten,
    outdoorTempWritten,
  };
}
