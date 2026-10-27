import { readFile } from "fs/promises";
import * as XLSX from "xlsx";
import type { DailyContext } from "@/lib/daily-context";
import type { EnergyRecord } from "@/lib/types";
import { parseHkdlGasWorkbook } from "@/lib/datastore/parsers/hkdl-gas-parser";
import { parseHkdlPowerWorkbook } from "@/lib/datastore/parsers/hkdl-power-parser";
import {
  parseHkdlSolarWorkbook,
  type StoredSolarInstallationRow,
} from "@/lib/datastore/parsers/hkdl-solar-parser";
import { buildSolarInstallationIndex } from "@/lib/solar-installations/aggregate";
import type { SolarInstallationIndex } from "@/lib/solar-installations/aggregate";
import { mergeTop10WorkbookData } from "@/lib/datastore/merge-top10-data";
import {
  parseHkdlTop10Workbook,
  type Top10WorkbookData,
} from "@/lib/datastore/parsers/hkdl-top10-parser";

export type HkdlWorkbookKind =
  | "gas"
  | "solar-feed-in"
  | "power"
  | "top10"
  | "unknown";

export function classifyHkdlWorkbook(filename: string): HkdlWorkbookKind {
  const lower = filename.toLowerCase();

  if (lower.includes("gas") && lower.includes("consumption")) {
    return "gas";
  }
  if (lower.includes("feed-in") || lower.includes("tariff")) {
    return "solar-feed-in";
  }
  if (
    lower.includes("power") &&
    (lower.includes("solar") || lower.includes("consumption"))
  ) {
    return "power";
  }
  if (lower.includes("top_10") || lower.includes("top-10") || lower.includes("top10")) {
    return "top10";
  }

  return "unknown";
}

export interface HkdlMasterLoadResult {
  records: EnergyRecord[];
  contexts: Record<string, DailyContext>;
  top10: Top10WorkbookData | null;
  solarInstallationIndex: SolarInstallationIndex;
  latestDate: string | null;
}

function mergeContexts(
  target: Record<string, DailyContext>,
  source: Record<string, DailyContext>,
): void {
  for (const [date, context] of Object.entries(source)) {
    target[date] = { ...(target[date] ?? {}), ...context };
  }
}

function latestDateFromRecords(records: EnergyRecord[]): string | null {
  if (records.length === 0) return null;
  return records.reduce(
    (latest, record) => (record.date > latest ? record.date : latest),
    records[0].date,
  );
}

export async function loadHkdlWorkbook(
  filePath: string,
  filename: string,
): Promise<{
  records: EnergyRecord[];
  contexts: Record<string, DailyContext>;
  top10?: Top10WorkbookData;
  installationSeries?: StoredSolarInstallationRow[];
}> {
  const buffer = await readFile(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const kind = classifyHkdlWorkbook(filename);

  switch (kind) {
    case "gas": {
      const { records, contexts } = parseHkdlGasWorkbook(workbook);
      return { records, contexts };
    }
    case "solar-feed-in": {
      const { records, contexts, installationSeries } =
        parseHkdlSolarWorkbook(workbook);
      return { records, contexts, installationSeries };
    }
    case "power": {
      const records = parseHkdlPowerWorkbook(workbook);
      return { records, contexts: {} };
    }
    case "top10": {
      const top10 = parseHkdlTop10Workbook(workbook);
      return { records: [], contexts: {}, top10 };
    }
    default:
      return { records: [], contexts: {} };
  }
}

export async function loadHkdlMasterSheets(
  files: Array<{ filePath: string; filename: string }>,
): Promise<HkdlMasterLoadResult> {
  const records: EnergyRecord[] = [];
  const contexts: Record<string, DailyContext> = {};
  let top10: Top10WorkbookData | null = null;
  const solarInstallationRows: StoredSolarInstallationRow[] = [];

  for (const { filePath, filename } of files) {
    const kind = classifyHkdlWorkbook(filename);
    if (kind === "unknown") continue;

    const result = await loadHkdlWorkbook(filePath, filename);
    records.push(...result.records);
    mergeContexts(contexts, result.contexts);
    if (result.top10) {
      top10 = mergeTop10WorkbookData(top10, result.top10);
    }
    if (result.installationSeries) {
      solarInstallationRows.push(...result.installationSeries);
    }
  }

  return {
    records,
    contexts,
    top10,
    solarInstallationIndex: buildSolarInstallationIndex(solarInstallationRows),
    latestDate: latestDateFromRecords(records),
  };
}
