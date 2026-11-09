import * as XLSX from "xlsx";
import Papa from "papaparse";
import { resolveExpectedMasterSheetFilename } from "@/lib/master-sheets-config";
import { parseHkdlTop10Workbook } from "@/lib/datastore/parsers/hkdl-top10-parser";
import { dailyReportDateFromEmsBatchDataDate } from "@/lib/hkdl-daily-report-date";
import { isRawCsvFilename, resolveRawLogicalId } from "@/lib/raw-data-config";

/** Parse EMS `Timestamp` cell to YYYY-MM-DD. */
export function timestampCellToDataDate(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/** Shared data date across raw CSV text bodies (null if missing or inconsistent). */
export function extractRawBatchDataDate(csvTexts: string[]): string | null {
  let expected: string | null = null;
  for (const text of csvTexts) {
    const parsed = Papa.parse<string[]>(text, {
      header: false,
      skipEmptyLines: true,
    });
    if (parsed.data.length < 2) continue;
    const header = parsed.data[0].map((c) => String(c ?? "").trim());
    const tsCol = header.findIndex((h) => /^timestamp$/i.test(h));
    const col = tsCol >= 0 ? tsCol : 0;
    const firstRow = parsed.data[1];
    const date = timestampCellToDataDate(firstRow[col]);
    if (!date) continue;
    if (expected === null) expected = date;
    else if (expected !== date) return null;
  }
  return expected;
}

/** Latest report date column in uploaded Top 10 workbook (mode B). */
export async function extractMasterBatchDataDate(
  files: File[],
): Promise<string | null> {
  const top10 = files.find((f) => {
    const canonical = resolveExpectedMasterSheetFilename(f.name);
    return canonical === "HKDL_Top_10.xlsx";
  });
  if (!top10) return null;

  const buffer = Buffer.from(await top10.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const parsed = parseHkdlTop10Workbook(workbook);
  if (parsed.dates.length === 0) return null;
  return parsed.dates.reduce((max, d) => (d > max ? d : max), parsed.dates[0]);
}

export async function extractRawBatchDataDateFromFiles(
  files: File[],
): Promise<string | null> {
  const texts: string[] = [];
  for (const file of files) {
    if (!isRawCsvFilename(file.name)) continue;
    if (!resolveRawLogicalId(file.name)) continue;
    texts.push(Buffer.from(await file.arrayBuffer()).toString("utf-8"));
  }
  return extractRawBatchDataDate(texts);
}

/** Master/dashboard date = shared EMS `Timestamp` day from the raw batch. */
export async function extractRawReportDateFromFiles(
  files: File[],
): Promise<string | null> {
  const dataDate = await extractRawBatchDataDateFromFiles(files);
  return dataDate ? dailyReportDateFromEmsBatchDataDate(dataDate) : null;
}

