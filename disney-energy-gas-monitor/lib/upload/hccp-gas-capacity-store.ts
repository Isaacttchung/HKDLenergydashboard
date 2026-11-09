import { mkdir, readdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { RAW_DATA_DIR } from "@/lib/raw-data-config";
import {
  addIsoDays,
  parseHccpGasCapacityMidnights,
} from "@/lib/raw-to-master/hccp-gas";

const DEFAULT_HCCP_GAS_CAPACITY_ARCHIVE_DIR = path.join(
  RAW_DATA_DIR,
  "hccp-gas-capacity",
);

export const HCCP_GAS_CAPACITY_ARCHIVE_BASENAME = "HCCP_Gas_Capacity";

function getArchiveDir(): string {
  const override = process.env.HCCP_GAS_CAPACITY_ARCHIVE_DIR?.trim();
  return override || DEFAULT_HCCP_GAS_CAPACITY_ARCHIVE_DIR;
}

export function monthKeyFromIsoDate(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function previousMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const utc = Date.UTC(y, m - 2, 1);
  const d = new Date(utc);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Month bucket from the latest midnight row in the Capacity export. */
export function inferHccpGasCapacityMonthKey(csvText: string): string {
  const midnights = parseHccpGasCapacityMidnights(csvText);
  const dates = [...midnights.keys()].sort();
  if (dates.length === 0) {
    throw new Error("HCCP Gas Capacity CSV has no midnight meter rows");
  }
  return monthKeyFromIsoDate(dates[dates.length - 1]!);
}

export function monthKeysSpanningConsumption(consumptionDate: string): string[] {
  const a = monthKeyFromIsoDate(consumptionDate);
  const b = monthKeyFromIsoDate(addIsoDays(consumptionDate, 1));
  return a === b ? [a] : [a, b];
}

function archiveFilename(monthKey: string): string {
  return `${HCCP_GAS_CAPACITY_ARCHIVE_BASENAME}_${monthKey}.csv`;
}

function archivePath(monthKey: string): string {
  return path.join(getArchiveDir(), archiveFilename(monthKey));
}

/** Prior month file is kept through the 2nd (inclusive); removed from the 3rd onward. */
export function shouldKeepPriorMonthArchive(referenceDate: string): boolean {
  const day = Number(referenceDate.slice(8, 10));
  return Number.isFinite(day) && day <= 2;
}

export async function saveHccpGasCapacityUpload(
  csvText: string,
): Promise<{ monthKey: string; filename: string }> {
  await mkdir(getArchiveDir(), { recursive: true });
  const monthKey = inferHccpGasCapacityMonthKey(csvText);
  const filename = archiveFilename(monthKey);
  await writeFile(archivePath(monthKey), csvText, "utf-8");
  return { monthKey, filename };
}

export async function pruneHccpGasCapacityArchive(
  referenceDate: string,
): Promise<string[]> {
  const currentMonth = monthKeyFromIsoDate(referenceDate);
  const allowed = new Set<string>([currentMonth]);
  if (shouldKeepPriorMonthArchive(referenceDate)) {
    allowed.add(previousMonthKey(currentMonth));
  }

  const removed: string[] = [];
  let entries: string[];
  try {
    entries = await readdir(getArchiveDir());
  } catch {
    return removed;
  }

  for (const name of entries) {
    const match = name.match(
      /^HCCP_Gas_Capacity_(\d{4}-\d{2})\.csv$/i,
    );
    if (!match) continue;
    const monthKey = match[1]!;
    if (allowed.has(monthKey)) continue;
    await unlink(path.join(getArchiveDir(), name));
    removed.push(name);
  }
  return removed;
}

/**
 * Merge uploaded Capacity CSV with on-disk month archive(s) for a consumption day.
 * The fresh upload wins for its month; prior month comes from archive when needed.
 */
export async function loadHccpGasCapacityCsvTextsForConsumption(
  consumptionDate: string,
  freshUploadCsv: string,
): Promise<string[]> {
  const neededMonths = monthKeysSpanningConsumption(consumptionDate);
  const freshMonth = inferHccpGasCapacityMonthKey(freshUploadCsv);
  const texts: string[] = [];
  const seen = new Set<string>();

  for (const month of neededMonths) {
    if (month === freshMonth) {
      texts.push(freshUploadCsv);
      seen.add(month);
      continue;
    }
    try {
      const archived = await readFile(archivePath(month), "utf-8");
      texts.push(archived);
      seen.add(month);
    } catch {
      // Conversion will fail with a clear missing-midnight error if required.
    }
  }

  if (!seen.has(freshMonth)) {
    texts.push(freshUploadCsv);
  }
  return texts;
}
