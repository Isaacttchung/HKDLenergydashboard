import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import * as XLSX from "xlsx";
import bundled from "@/lib/raw-to-master/top-10-rawdata-rows.json";
import { TOP10_MASTER_FILENAME } from "@/lib/raw-to-master/top-10";
import {
  clearTop10RawDataRowsCache,
  top10RawDataRowsOverridePath,
  type Top10RawDataRow,
} from "@/lib/raw-to-master/load-top-10-rawdata-rows";
import { WEBSS_SHEET_NAME } from "@/lib/raw-to-master/top-10-webss";
import { MASTER_SHEETS_DIR } from "@/lib/master-sheets-config";
import { backupFilesForEdit } from "@/lib/master-editor/backup";

export class Top10EditorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Top10EditorError";
  }
}

export async function ensureMappingOverrideCopy(): Promise<string> {
  const overridePath = top10RawDataRowsOverridePath();
  await mkdir(path.dirname(overridePath), { recursive: true });
  try {
    await readFile(overridePath);
  } catch {
    await writeFile(overridePath, JSON.stringify(bundled, null, 2), "utf-8");
  }
  return overridePath;
}

export function masterWorkbookPath(): string {
  return path.join(MASTER_SHEETS_DIR, TOP10_MASTER_FILENAME);
}

export async function readTop10Workbook(): Promise<{
  workbook: XLSX.WorkBook;
  sheet: XLSX.WorkSheet;
  masterPath: string;
}> {
  const masterPath = masterWorkbookPath();
  const buffer = await readFile(masterPath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets[WEBSS_SHEET_NAME];
  if (!sheet) {
    throw new Top10EditorError(`Missing sheet "${WEBSS_SHEET_NAME}"`);
  }
  return { workbook, sheet, masterPath };
}

export async function persistTop10Edit(
  workbook: XLSX.WorkBook,
  mappingRows: Top10RawDataRow[],
): Promise<string> {
  const masterPath = masterWorkbookPath();
  const overridePath = await ensureMappingOverrideCopy();
  const backupDir = await backupFilesForEdit([
    { label: TOP10_MASTER_FILENAME, absolutePath: masterPath },
    { label: "top-10-rawdata-rows.json", absolutePath: overridePath },
  ]);
  const out = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  await writeFile(masterPath, out);
  await writeFile(overridePath, JSON.stringify(mappingRows, null, 2), "utf-8");
  clearTop10RawDataRowsCache();
  return backupDir;
}
