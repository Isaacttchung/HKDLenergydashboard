import type { WorkBook } from "xlsx";
import * as XLSX from "xlsx";
import type { DailyContext } from "@/lib/daily-context";
import type { EnergyRecord } from "@/lib/types";
import {
  excelSerialToDate,
  findColumnKey,
  normalizeHeader,
  parseMetricValue,
} from "@/lib/datastore/parsers/excel-utils";

const SHEET_NAME = "Summary_kWh_Data Input";

export interface StoredSolarInstallationRow {
  date: string;
  installations: Record<string, number>;
}

export function parseHkdlSolarWorkbook(workbook: WorkBook): {
  records: EnergyRecord[];
  contexts: Record<string, DailyContext>;
  installationSeries: StoredSolarInstallationRow[];
} {
  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) {
    throw new Error(`Missing sheet "${SHEET_NAME}" in solar feed-in workbook`);
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const records: EnergyRecord[] = [];
  const contexts: Record<string, DailyContext> = {};
  const installationSeries: StoredSolarInstallationRow[] = [];

  for (const row of rows) {
    const dateKey = findColumnKey(row, "Date");
    if (!dateKey) continue;

    const date = excelSerialToDate(row[dateKey]);
    if (!date) continue;

    const totalKey = findColumnKey(row, "Total");
    const sunshineKey = findColumnKey(row, "Sunshine (Hr)", "Sunshine (hr)");
    const rainfallKey = findColumnKey(row, "Rainfall (mm)");

    const allowZero = { treatZeroAsMissing: false } as const;
    const totalSolar = totalKey ? parseMetricValue(row[totalKey]) : null;
    const sunshine = sunshineKey
      ? parseMetricValue(row[sunshineKey], allowZero)
      : null;
    const rainfall = rainfallKey
      ? parseMetricValue(row[rainfallKey], allowZero)
      : null;

    const context: DailyContext = {
      ...(contexts[date] ?? {}),
    };

    if (sunshine !== null) context.sunshineHours = sunshine;
    if (rainfall !== null) context.rainfallMm = rainfall;

    if (totalSolar !== null) {
      records.push({
        date,
        sourceId: "solar-total",
        energyType: "solar",
        valueKwh: totalSolar,
        costHkd: null,
      });
    }

    const installations: Record<string, number> = {};
    for (const [key, value] of Object.entries(row)) {
      if (key === dateKey) continue;
      const normalized = normalizeHeader(key);
      if (
        normalized === "total" ||
        normalized.startsWith("sunshine") ||
        normalized.startsWith("rainfall") ||
        normalized === "30 days" ||
        normalized === ""
      ) {
        continue;
      }

      const parsed = parseMetricValue(value, { treatZeroAsMissing: false });
      if (parsed !== null) {
        installations[String(key).trim()] = parsed;
      }
    }

    if (Object.keys(installations).length > 0) {
      installationSeries.push({ date, installations });
    }

    if (Object.keys(context).length > 0) {
      contexts[date] = context;
    }
  }

  return { records, contexts, installationSeries };
}
