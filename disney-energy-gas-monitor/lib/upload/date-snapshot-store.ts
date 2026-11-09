import { access, copyFile, mkdir, writeFile } from "fs/promises";
import path from "path";
import { EXPECTED_MASTER_SHEET_FILES } from "@/lib/expected-master-sheet-files";
import { HCCP_GAS_CAPACITY_LOGICAL_ID } from "@/lib/raw-data-config";
import { MASTER_SHEETS_DIR } from "@/lib/master-sheets-config";
import { RAW_CONVERSION_FEED_IN_MASTER } from "@/lib/upload/batch-classifier";

export const DATE_SNAPSHOTS_DIR = path.join(process.cwd(), "data", "snapshots");

export interface RawSnapshotEntry {
  logicalId: string;
  /** UTF-8 text for CSV; buffer for xlsx feed-in in raw folder */
  content: string | Buffer;
}

function snapshotRoot(reportDate: string): string {
  return path.join(DATE_SNAPSHOTS_DIR, reportDate);
}

function rawDir(reportDate: string): string {
  return path.join(snapshotRoot(reportDate), "raw");
}

function mastersDir(reportDate: string): string {
  return path.join(snapshotRoot(reportDate), "masters");
}

function rawSnapshotBasename(logicalId: string): string {
  if (logicalId === HCCP_GAS_CAPACITY_LOGICAL_ID) {
    return "HCCP_Gas_Capacity.csv";
  }
  if (logicalId === RAW_CONVERSION_FEED_IN_MASTER) {
    return RAW_CONVERSION_FEED_IN_MASTER;
  }
  return `${logicalId}.csv`;
}

export async function saveRawSnapshotForDate(
  reportDate: string,
  entries: RawSnapshotEntry[],
): Promise<void> {
  const dir = rawDir(reportDate);
  await mkdir(dir, { recursive: true });
  for (const { logicalId, content } of entries) {
    const basename = rawSnapshotBasename(logicalId);
    const filePath = path.join(dir, basename);
    if (Buffer.isBuffer(content)) {
      await writeFile(filePath, content);
    } else {
      await writeFile(filePath, content, "utf-8");
    }
  }
}

/** Copy current master workbooks into the date snapshot (after conversion or manual edits). */
export async function saveMasterSnapshotForDate(
  reportDate: string,
): Promise<void> {
  const dir = mastersDir(reportDate);
  await mkdir(dir, { recursive: true });
  for (const name of EXPECTED_MASTER_SHEET_FILES) {
    const src = path.join(MASTER_SHEETS_DIR, name);
    try {
      await access(src);
    } catch {
      continue;
    }
    await copyFile(src, path.join(dir, name));
  }
}

export async function snapshotExistsForDate(
  reportDate: string,
): Promise<boolean> {
  try {
    await access(snapshotRoot(reportDate));
    return true;
  } catch {
    return false;
  }
}

export async function resolveDateSnapshotPath(
  reportDate: string,
  kind: "raw" | "master",
  id: string,
): Promise<string | null> {
  const base =
    kind === "raw" ? rawDir(reportDate) : mastersDir(reportDate);
  const basename =
    kind === "raw" ? rawSnapshotBasename(id) : id;
  const filePath = path.join(base, basename);
  try {
    await access(filePath);
    return filePath;
  } catch {
    return null;
  }
}

export async function listMastersInSnapshot(
  reportDate: string,
): Promise<string[]> {
  const masters: string[] = [];
  for (const name of EXPECTED_MASTER_SHEET_FILES) {
    if (await resolveDateSnapshotPath(reportDate, "master", name)) {
      masters.push(name);
    }
  }
  return masters;
}

async function listDirSafe(dir: string): Promise<string[]> {
  try {
    const { readdir } = await import("fs/promises");
    return await readdir(dir);
  } catch {
    return [];
  }
}

/** Read snapshot manifest file names for API (logical ids for raw). */
export async function listRawLogicalIdsInSnapshot(
  reportDate: string,
): Promise<string[]> {
  const dir = rawDir(reportDate);
  const names = await listDirSafe(dir);
  const ids: string[] = [];
  for (const name of names) {
    if (name === RAW_CONVERSION_FEED_IN_MASTER) {
      ids.push(RAW_CONVERSION_FEED_IN_MASTER);
    } else if (name === "HCCP_Gas_Capacity.csv") {
      ids.push(HCCP_GAS_CAPACITY_LOGICAL_ID);
    } else if (name.endsWith(".csv")) {
      ids.push(name.replace(/\.csv$/i, ""));
    }
  }
  return ids.sort();
}
