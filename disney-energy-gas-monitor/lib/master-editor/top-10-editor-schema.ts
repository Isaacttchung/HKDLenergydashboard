import { readFile } from "fs/promises";
import path from "path";
import * as XLSX from "xlsx";
import {
  getTop10RawDataRows,
  mappingSource,
  type Top10RawDataRow,
} from "@/lib/raw-to-master/load-top-10-rawdata-rows";
import { TOP10_MASTER_FILENAME } from "@/lib/raw-to-master/top-10";
import {
  buildWebSsRowIndex,
  findMappingForWebSsRow,
  normalizeTop10Location,
  WEBSS_SHEET_NAME,
} from "@/lib/raw-to-master/top-10-webss";
import { MASTER_SHEETS_DIR } from "@/lib/master-sheets-config";

export interface Top10EditorRow {
  sheetRow: number;
  meter: string;
  location: string;
  mapped: boolean;
  rawDataRow?: number;
  kind?: Top10RawDataRow["kind"];
}

export interface Top10EditorSchema {
  masterFilename: string;
  mappingSource: "override" | "bundled";
  rows: Top10EditorRow[];
  mappingCount: number;
  unmappedSheetRows: number;
}

export async function loadTop10EditorSchema(): Promise<Top10EditorSchema> {
  const masterPath = path.join(MASTER_SHEETS_DIR, TOP10_MASTER_FILENAME);
  const buffer = await readFile(masterPath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets[WEBSS_SHEET_NAME];
  if (!sheet) {
    throw new Error(`Top_10 master missing sheet "${WEBSS_SHEET_NAME}"`);
  }

  const index = buildWebSsRowIndex(sheet);
  const mappingRows = getTop10RawDataRows();

  const rows: Top10EditorRow[] = [];
  let unmapped = 0;
  for (const [key, sheetRow] of index) {
    const pipe = key.indexOf("|");
    const meter = key.slice(0, pipe);
    const location = normalizeTop10Location(key.slice(pipe + 1));
    const mapping = findMappingForWebSsRow(index, sheetRow, mappingRows);
    const displayMeter =
      sheet[XLSX.utils.encode_cell({ r: sheetRow, c: 0 })]?.v ?? meter;
    const displayLocation =
      sheet[XLSX.utils.encode_cell({ r: sheetRow, c: 1 })]?.v ?? location;
    const mapped = Boolean(mapping);
    if (!mapped) unmapped += 1;
    rows.push({
      sheetRow,
      meter: String(displayMeter).trim(),
      location: normalizeTop10Location(String(displayLocation)),
      mapped,
      rawDataRow: mapping?.rawDataRow,
      kind: mapping?.kind,
    });
  }

  rows.sort((a, b) => a.sheetRow - b.sheetRow);

  return {
    masterFilename: TOP10_MASTER_FILENAME,
    mappingSource: mappingSource(),
    rows,
    mappingCount: mappingRows.filter(
      (r) => !(r.kind === "skip" && !r.meter && !r.location),
    ).length,
    unmappedSheetRows: unmapped,
  };
}
