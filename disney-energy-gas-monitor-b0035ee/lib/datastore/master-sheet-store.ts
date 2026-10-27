import { readdir, stat } from "fs/promises";
import path from "path";
import type { DailyContext } from "@/lib/daily-context";
import type { EnergyRecord } from "@/lib/types";
import type { IDataStore } from "@/lib/datastore/interface";
import {
  classifyHkdlWorkbook,
  loadHkdlMasterSheets,
} from "@/lib/datastore/hkdl-master-loader";
import type { Top10WorkbookData } from "@/lib/datastore/parsers/hkdl-top10-parser";
import type { SolarInstallationIndex } from "@/lib/solar-installations/aggregate";
import { latestDailyReportDate } from "@/lib/reporting-date";
import { parseCsvFile } from "@/lib/datastore/parsers/csv-parser";
import { parseExcelFile } from "@/lib/datastore/parsers/excel-parser";
import {
  EXPECTED_MASTER_SHEET_FILES,
  MASTER_SHEETS_DIR,
} from "@/lib/master-sheets-config";

const expectedMasterSheetSet = new Set<string>(EXPECTED_MASTER_SHEET_FILES);

interface MasterSheetCache {
  records: EnergyRecord[];
  contexts: Record<string, DailyContext>;
  top10: Top10WorkbookData | null;
  solarInstallationIndex: SolarInstallationIndex;
  earliestDate: string | null;
  latestDate: string | null;
  /** Max mtime (ms) of canonical master sheets when this cache was built. */
  sourceModifiedAtMs: number;
}

async function canonicalMasterSheetsLatestMtimeMs(): Promise<number> {
  let latest = 0;
  for (const name of EXPECTED_MASTER_SHEET_FILES) {
    try {
      const info = await stat(path.join(MASTER_SHEETS_DIR, name));
      latest = Math.max(latest, info.mtimeMs);
    } catch {
      // missing file
    }
  }
  return latest;
}

function earliestDateFromRecords(records: EnergyRecord[]): string | null {
  const dated = records.filter((record) => record.date);
  if (dated.length === 0) return null;
  return dated.reduce(
    (earliest, record) => (record.date < earliest ? record.date : earliest),
    dated[0].date,
  );
}

export class MasterSheetDataStore implements IDataStore {
  private cache: MasterSheetCache | null = null;

  async load(): Promise<MasterSheetCache> {
    const diskMtimeMs = await canonicalMasterSheetsLatestMtimeMs();
    if (
      this.cache &&
      this.cache.sourceModifiedAtMs >= diskMtimeMs &&
      this.cache.solarInstallationIndex !== undefined
    ) {
      return this.cache;
    }

    const files = await readdir(MASTER_SHEETS_DIR);
    const records: EnergyRecord[] = [];
    const contexts: Record<string, DailyContext> = {};
    const hkdlFiles: Array<{ filePath: string; filename: string }> = [];

    for (const file of files) {
      const filePath = path.join(MASTER_SHEETS_DIR, file);
      const lower = file.toLowerCase();

      if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        if (expectedMasterSheetSet.has(file)) {
          hkdlFiles.push({ filePath, filename: file });
          continue;
        }
        if (classifyHkdlWorkbook(file) !== "unknown") {
          // Ignore duplicate workbooks saved under non-canonical names (common after manual copies).
          continue;
        }
        records.push(...(await parseExcelFile(filePath)));
      } else if (lower.endsWith(".csv")) {
        records.push(...(await parseCsvFile(filePath)));
      }
    }

    const hkdlResult = await loadHkdlMasterSheets(hkdlFiles);
    records.push(...hkdlResult.records);

    for (const [date, context] of Object.entries(hkdlResult.contexts)) {
      contexts[date] = { ...(contexts[date] ?? {}), ...context };
    }

    const datedRecords = records.filter((record) => record.date);
    const earliestDate = earliestDateFromRecords(datedRecords);
    const latestDate = latestDailyReportDate(records);

    this.cache = {
      records,
      contexts,
      top10: hkdlResult.top10,
      solarInstallationIndex: hkdlResult.solarInstallationIndex,
      earliestDate,
      latestDate,
      sourceModifiedAtMs: diskMtimeMs,
    };
    return this.cache;
  }

  async getRecords(): Promise<EnergyRecord[]> {
    const data = await this.load();
    return data.records;
  }

  async getDailyContexts(): Promise<Record<string, DailyContext>> {
    const data = await this.load();
    return data.contexts;
  }

  async getLatestDate(): Promise<string | null> {
    const data = await this.load();
    return data.latestDate;
  }

  async getEarliestDate(): Promise<string | null> {
    const data = await this.load();
    return data.earliestDate;
  }

  async getTop10Data(): Promise<Top10WorkbookData | null> {
    const data = await this.load();
    return data.top10;
  }

  async getSolarInstallationIndex(): Promise<SolarInstallationIndex> {
    const data = await this.load();
    return data.solarInstallationIndex;
  }

  clearCache(): void {
    this.cache = null;
  }
}

/** Shared across Next.js server bundles (API routes vs RSC) and dev hot reload. */
const storeGlobal = globalThis as typeof globalThis & {
  __hkdlMasterSheetDataStore?: MasterSheetDataStore;
};

/** Avoid `instanceof` — Turbopack can load duplicate class identities across chunks. */
function isCompatibleDataStore(
  store: MasterSheetDataStore | undefined,
): store is MasterSheetDataStore {
  return (
    store != null &&
    typeof store.getRecords === "function" &&
    typeof store.getSolarInstallationIndex === "function"
  );
}

export function getDataStore(): MasterSheetDataStore {
  if (!isCompatibleDataStore(storeGlobal.__hkdlMasterSheetDataStore)) {
    storeGlobal.__hkdlMasterSheetDataStore = new MasterSheetDataStore();
  }
  return storeGlobal.__hkdlMasterSheetDataStore;
}

export function clearDataStoreCache(): void {
  storeGlobal.__hkdlMasterSheetDataStore?.clearCache();
  delete storeGlobal.__hkdlMasterSheetDataStore;
}
