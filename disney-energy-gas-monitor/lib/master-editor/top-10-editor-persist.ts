import type ExcelJS from "exceljs";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import bundled from "@/lib/raw-to-master/top-10-rawdata-rows.json";
import { TOP10_MASTER_FILENAME } from "@/lib/raw-to-master/top-10";
import {
  clearTop10RawDataRowsCache,
  top10RawDataRowsOverridePath,
  type Top10RawDataRow,
} from "@/lib/raw-to-master/load-top-10-rawdata-rows";
import {
  getWebSsSheet,
} from "@/lib/raw-to-master/top-10-excel";
import {
  loadExcelWorkbook,
  saveExcelWorkbook,
} from "@/lib/raw-to-master/exceljs-preserve";
import { clearSolarFeedInExemptionCache } from "@/lib/raw-csv-solar-exemptions";
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
  workbook: ExcelJS.Workbook;
  sheet: ExcelJS.Worksheet;
  masterPath: string;
}> {
  const masterPath = masterWorkbookPath();
  const workbook = await loadExcelWorkbook(masterPath);
  const sheet = getWebSsSheet(workbook);
  return { workbook, sheet, masterPath };
}

export async function persistTop10Edit(
  workbook: ExcelJS.Workbook,
  mappingRows: Top10RawDataRow[],
): Promise<string> {
  const masterPath = masterWorkbookPath();
  const overridePath = await ensureMappingOverrideCopy();
  const backupDir = await backupFilesForEdit([
    { label: TOP10_MASTER_FILENAME, absolutePath: masterPath },
    { label: "top-10-rawdata-rows.json", absolutePath: overridePath },
  ]);
  await saveExcelWorkbook(workbook, masterPath);
  await writeFile(overridePath, JSON.stringify(mappingRows, null, 2), "utf-8");
  clearTop10RawDataRowsCache();
  clearSolarFeedInExemptionCache();
  return backupDir;
}
