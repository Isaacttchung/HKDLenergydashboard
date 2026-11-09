import type { WorkBook } from "xlsx";
import * as XLSX from "xlsx";
import type { EnergyRecord } from "@/lib/types";
import {
  excelSerialToDate,
  findColumnKey,
  parseMetricValue,
} from "@/lib/datastore/parsers/excel-utils";

type PowerSheetConfig = {
  sheetName: string;
  headerRow: number;
  metrics: Array<{
    columnCandidates: string[];
    sourceId: string;
  }>;
};

const POWER_SHEETS: PowerSheetConfig[] = [
  {
    sheetName: "CCP",
    headerRow: 0,
    metrics: [
      {
        columnCandidates: ["Total Power Consumption of CCP (kWh)"],
        sourceId: "ccp",
      },
    ],
  },
  {
    sheetName: "HCCP",
    headerRow: 0,
    metrics: [
      {
        columnCandidates: [
          "Total Power Consumption of HCCP (kWh)",
          "Total Power Consumption of HCCP",
        ],
        sourceId: "hccp",
      },
      {
        columnCandidates: ["SS303B_TxD3_C12 CSB"],
        sourceId: "csb",
      },
    ],
  },
  {
    sheetName: "Park",
    headerRow: 0,
    metrics: [
      {
        columnCandidates: ["Total Power Consumption of ThemePark (kWh)"],
        sourceId: "park",
      },
    ],
  },
  {
    sheetName: "Hotel",
    headerRow: 1,
    metrics: [
      {
        columnCandidates: ["Total Power Consumption of hotel (kWh)"],
        sourceId: "hotel-total",
      },
      {
        columnCandidates: ["DHH Total kWh"],
        sourceId: "dhh",
      },
      {
        columnCandidates: ["DLH Total Sum"],
        sourceId: "dlh",
      },
      {
        columnCandidates: ["DEL Total Sum"],
        sourceId: "del",
      },
    ],
  },
];

function sheetToRows(
  workbook: WorkBook,
  sheetName: string,
  headerRow: number,
): Record<string, unknown>[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Missing sheet "${sheetName}" in power consumption workbook`);
  }

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    range: headerRow,
    defval: "",
  });
}

export function parseHkdlPowerWorkbook(workbook: WorkBook): EnergyRecord[] {
  const records: EnergyRecord[] = [];

  for (const config of POWER_SHEETS) {
    const rows = sheetToRows(workbook, config.sheetName, config.headerRow);

    for (const row of rows) {
      const dateKey = findColumnKey(row, "Date");
      if (!dateKey) continue;

      const date = excelSerialToDate(row[dateKey]);
      if (!date) continue;

      for (const metric of config.metrics) {
        const columnKey = findColumnKey(row, ...metric.columnCandidates);
        if (!columnKey) continue;

        const value = parseMetricValue(row[columnKey]);
        if (value === null) continue;

        if (metric.sourceId === "hotel-total") {
          continue;
        }

        records.push({
          date,
          sourceId: metric.sourceId,
          energyType: "electricity",
          valueKwh: value,
          costHkd: null,
        });
      }
    }
  }

  return records;
}
