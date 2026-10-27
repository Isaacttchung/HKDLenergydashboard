import { readdir, stat } from "fs/promises";
import path from "path";
import { getDataStore } from "@/lib/datastore/master-sheet-store";
import {
  EXPECTED_MASTER_SHEET_FILES,
  MASTER_SHEETS_DIR,
} from "@/lib/master-sheets-config";

export interface MasterSheetFileStatus {
  name: string;
  present: boolean;
  sizeBytes?: number;
  modifiedAt?: string;
}

export interface MasterSheetsHostStatus {
  /** Absolute path where uploads are written on this server process. */
  masterSheetsDirectory: string;
  /** process.cwd() for the Node process serving the app — uploads use this folder. */
  workingDirectory: string;
  expected: MasterSheetFileStatus[];
  /** Other .xlsx/.xls in the folder (can shadow or confuse if duplicates of the four workbooks). */
  extraSpreadsheetFiles: string[];
  latestReportDate: string | null;
  earliestDataDate: string | null;
}

function isSpreadsheet(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}

export async function getMasterSheetsHostStatus(): Promise<MasterSheetsHostStatus> {
  await stat(MASTER_SHEETS_DIR).catch(async () => {
    const { mkdir } = await import("fs/promises");
    await mkdir(MASTER_SHEETS_DIR, { recursive: true });
  });

  const onDisk = await readdir(MASTER_SHEETS_DIR);
  const expectedSet = new Set<string>(EXPECTED_MASTER_SHEET_FILES);

  const expected: MasterSheetFileStatus[] = [];
  for (const name of EXPECTED_MASTER_SHEET_FILES) {
    if (!onDisk.includes(name)) {
      expected.push({ name, present: false });
      continue;
    }
    const filePath = path.join(MASTER_SHEETS_DIR, name);
    const info = await stat(filePath);
    expected.push({
      name,
      present: true,
      sizeBytes: info.size,
      modifiedAt: info.mtime.toISOString(),
    });
  }

  const extraSpreadsheetFiles = onDisk.filter(
    (name) => isSpreadsheet(name) && !expectedSet.has(name),
  );

  const store = getDataStore();
  const [latestReportDate, earliestDataDate] = await Promise.all([
    store.getLatestDate(),
    store.getEarliestDate(),
  ]);

  return {
    masterSheetsDirectory: MASTER_SHEETS_DIR,
    workingDirectory: process.cwd(),
    expected,
    extraSpreadsheetFiles,
    latestReportDate,
    earliestDataDate,
  };
}
