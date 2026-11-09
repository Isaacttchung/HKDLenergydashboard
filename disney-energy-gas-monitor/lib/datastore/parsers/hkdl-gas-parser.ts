import type { WorkBook } from "xlsx";
import * as XLSX from "xlsx";
import type { DailyContext } from "@/lib/daily-context";
import type { EnergyRecord } from "@/lib/types";
import {
  excelSerialToDate,
  findColumnKey,
  gasUnitsToKwh,
  parseMetricValue,
} from "@/lib/datastore/parsers/excel-utils";

const SHEET_NAME = "Gas Meter Reading";

export function parseHkdlGasWorkbook(workbook: WorkBook): {
  records: EnergyRecord[];
  contexts: Record<string, DailyContext>;
} {
  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) {
    throw new Error(`Missing sheet "${SHEET_NAME}" in gas consumption workbook`);
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const records: EnergyRecord[] = [];
  const contexts: Record<string, DailyContext> = {};

  for (const row of rows) {
    const dateKey = findColumnKey(row, "Date");
    const gasKey = findColumnKey(row, "Gas Consumption (Units)");
    if (!dateKey || !gasKey) continue;

    const date = excelSerialToDate(row[dateKey]);
    if (!date) continue;

    const allowZero = { treatZeroAsMissing: false } as const;
    const gasUnits = parseMetricValue(row[gasKey], allowZero);
    const outdoorTemp = parseMetricValue(
      row[findColumnKey(row, "Outdoor Air Temperature") ?? ""],
      allowZero,
    );
    const ballroom = parseMetricValue(
      row[findColumnKey(row, "Ballroom utilization") ?? ""],
      allowZero,
    );
    const overallOccupancy = parseMetricValue(
      row[findColumnKey(row, "Overall Occupancy") ?? ""],
      allowZero,
    );
    const dhhOccupancy = parseMetricValue(
      row[findColumnKey(row, "DHH Occupancy") ?? ""],
      allowZero,
    );
    const dlhOccupancy = parseMetricValue(
      row[findColumnKey(row, "DLH Occupancy") ?? ""],
      allowZero,
    );
    const delOccupancy = parseMetricValue(
      row[findColumnKey(row, "DEL Occupancy") ?? ""],
      allowZero,
    );

    const context: DailyContext = {
      ...(contexts[date] ?? {}),
    };

    if (outdoorTemp !== null) context.outdoorTempC = outdoorTemp;
    if (ballroom !== null) context.ballroomUtilizationPct = ballroom;
    if (overallOccupancy !== null) context.hotelOccupancyPct = overallOccupancy;
    if (dhhOccupancy !== null) context.dhhOccupancyPct = dhhOccupancy;
    if (dlhOccupancy !== null) context.dlhOccupancyPct = dlhOccupancy;
    if (delOccupancy !== null) context.delOccupancyPct = delOccupancy;

    if (gasUnits !== null) {
      context.gasUnits = gasUnits;
      context.gasUnitLabel = "1 unit = 100 ft³";

      records.push({
        date,
        sourceId: "resort-gas",
        energyType: "gas",
        valueKwh: gasUnitsToKwh(gasUnits),
        costHkd: null,
      });
    }

    if (Object.keys(context).length > 0) {
      contexts[date] = context;
    }
  }

  return { records, contexts };
}
