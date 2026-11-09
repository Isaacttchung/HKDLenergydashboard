import { readFile } from "fs/promises";
import path from "path";
import { getDataStore } from "@/lib/datastore/master-sheet-store";
import { hasDailyReportData } from "@/lib/reporting-date";

export interface DailyContext {
  reportTitle?: string;
  outdoorTempC?: number;
  ballroomUtilizationPct?: number;
  hotelOccupancyPct?: number;
  dhhOccupancyPct?: number;
  dlhOccupancyPct?: number;
  delOccupancyPct?: number;
  sunshineHours?: number;
  rainfallMm?: number;
  gasUnits?: number;
  gasUnitLabel?: string;
  yoyChangePct?: number;
  notes?: string[];
}

type DailyContextFile = Record<string, DailyContext>;

let staticCache: DailyContextFile | null = null;

async function loadStaticContextFile(): Promise<DailyContextFile> {
  if (staticCache) return staticCache;
  const filePath = path.join(process.cwd(), "data", "daily-context.json");
  try {
    const content = await readFile(filePath, "utf-8");
    staticCache = JSON.parse(content) as DailyContextFile;
  } catch {
    staticCache = {};
  }
  return staticCache;
}

export async function getDailyContext(date: string): Promise<DailyContext | null> {
  const store = getDataStore();
  const [records, masterContexts, staticContexts] = await Promise.all([
    store.getRecords(),
    store.getDailyContexts(),
    loadStaticContextFile(),
  ]);

  if (!hasDailyReportData(records, date)) {
    return null;
  }

  const context = {
    ...(staticContexts[date] ?? {}),
    ...(masterContexts[date] ?? {}),
  };

  return Object.keys(context).length > 0 ? context : null;
}

export async function getLatestDataDate(): Promise<string | null> {
  const store = getDataStore();
  return store.getLatestDate();
}

export async function getEarliestDataDate(): Promise<string | null> {
  const store = getDataStore();
  return store.getEarliestDate();
}
