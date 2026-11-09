import type { RawCsvWarning } from "@/lib/raw-csv-validation";
import { POWER_SOLAR_MASTER_FILENAME } from "@/lib/raw-to-master/power-solar";
import { RAW_CONVERSION_FEED_IN_MASTER } from "@/lib/upload/batch-classifier";

export type DownloadableKind = "raw" | "master";

export interface DownloadableAfterWarning {
  kind: DownloadableKind;
  /** Logical raw id or canonical master filename */
  id: string;
  label: string;
  downloadUrl: string;
}

const TOP10_MASTER = "HKDL_Top_10.xlsx";

function buildDownloadUrl(kind: DownloadableKind, id: string): string {
  const params = new URLSearchParams({ kind, id });
  return `/api/master-sheets/download?${params.toString()}`;
}

/** Distinct raw logical ids referenced in warnings. */
export function distinctWarningRawFiles(
  warnings: RawCsvWarning[],
): string[] {
  return [...new Set(warnings.map((w) => w.file))].sort();
}

/**
 * Masters to offer after raw conversion when warnings exist.
 * Top_10 is always included for the current stub/pipeline; extend when other masters convert.
 */
export function mastersAffectedByRawWarnings(
  _warnings: RawCsvWarning[],
): string[] {
  return [TOP10_MASTER, POWER_SOLAR_MASTER_FILENAME];
}

export function buildDownloadableAfterWarnings(
  warnings: RawCsvWarning[],
  options: { includeMasters: boolean },
): DownloadableAfterWarning[] {
  const items: DownloadableAfterWarning[] = [];

  for (const logicalId of distinctWarningRawFiles(warnings)) {
    items.push({
      kind: "raw",
      id: logicalId,
      label: `${logicalId}.csv (staged raw)`,
      downloadUrl: buildDownloadUrl("raw", logicalId),
    });
  }

  if (options.includeMasters) {
    for (const name of mastersAffectedByRawWarnings(warnings)) {
      items.push({
        kind: "master",
        id: name,
        label: name,
        downloadUrl: buildDownloadUrl("master", name),
      });
    }
  }

  return items;
}

/** Feed-in is staged as a master file during raw conversion (not listed in warnings downloads unless needed). */
export function feedInMasterForRawConversion(): string {
  return RAW_CONVERSION_FEED_IN_MASTER;
}
