import rawDataRows from "@/lib/raw-to-master/top-10-rawdata-rows.json";
import { excelColumnLetterToIndex } from "@/lib/raw-to-master/excel-date";
import {
  MERCURY_RAW_LOGICAL_IDS,
  POWER_SOLAR_METER_MAPPINGS,
  type MercuryRawLogicalId,
} from "@/lib/raw-to-master/power-solar-mappings";
import { TOP10_LINK_ID_TO_LOGICAL_ID } from "@/lib/raw-to-master/top-10-link-map";

function columnExemptionKey(logicalId: string, columnIndex: number): string {
  return `${logicalId}|${columnIndex}`;
}

let cachedExemptColumns: Set<string> | null = null;

/**
 * Columns whose raw cumulative may decrease when onsite solar exports to the grid.
 * CHHP meters: Formula CHHP **Feed-in** column (tariff sheet letters).
 * Top_10 meters: RawData solar rows with **feedInTariffColumns**.
 */
export function buildSolarFeedInExemptColumns(): Set<string> {
  const exempt = new Set<string>();

  for (const mapping of POWER_SOLAR_METER_MAPPINGS) {
    if (mapping.feedInTariffColumns.length === 0) continue;
    const colIndex = excelColumnLetterToIndex(mapping.rawColumnLetter);
    exempt.add(columnExemptionKey(mapping.rawLogicalId, colIndex));
  }

  for (const row of rawDataRows) {
    if (row.kind !== "solar" || row.feedInTariffColumns.length === 0) continue;
    if (!row.importRef) continue;
    const logicalId = TOP10_LINK_ID_TO_LOGICAL_ID[row.importRef.link];
    if (!logicalId) continue;
    const colIndex = excelColumnLetterToIndex(row.importRef.col);
    exempt.add(columnExemptionKey(logicalId, colIndex));
  }

  return exempt;
}

function exemptColumns(): Set<string> {
  if (!cachedExemptColumns) {
    cachedExemptColumns = buildSolarFeedInExemptColumns();
  }
  return cachedExemptColumns;
}

/** Clear after tests or mapping config reload (Top 10 editor). */
export function clearSolarFeedInExemptionCache(): void {
  cachedExemptColumns = null;
}

export function isSolarFeedInLinkedRawColumn(
  fileLogicalId: string,
  columnIndex: number,
): boolean {
  return exemptColumns().has(columnExemptionKey(fileLogicalId, columnIndex));
}

export function isMercuryRawLogicalId(
  id: string,
): id is MercuryRawLogicalId {
  return (MERCURY_RAW_LOGICAL_IDS as readonly string[]).includes(id);
}
