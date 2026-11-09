import { EXPECTED_MASTER_SHEET_FILES } from "@/lib/expected-master-sheet-files";
import { EXPECTED_RAW_LOGICAL_IDS } from "@/lib/expected-raw-logical-ids";
import { HCCP_GAS_CAPACITY_LOGICAL_ID } from "@/lib/raw-data-config";
import { RAW_CONVERSION_FEED_IN_MASTER } from "@/lib/upload/batch-classifier";

export type SourceDownloadKind = "raw" | "master";

export interface SourceDownloadItem {
  kind: SourceDownloadKind;
  id: string;
  label: string;
}

export const RAW_DATA_DOWNLOAD_ITEMS: SourceDownloadItem[] = [
  ...EXPECTED_RAW_LOGICAL_IDS.map((id) => ({
    kind: "raw" as const,
    id,
    label: `${id}.csv`,
  })),
  {
    kind: "raw",
    id: HCCP_GAS_CAPACITY_LOGICAL_ID,
    label: "HCCP Gas Capacity.csv",
  },
  {
    kind: "raw",
    id: RAW_CONVERSION_FEED_IN_MASTER,
    label: RAW_CONVERSION_FEED_IN_MASTER,
  },
];

export const MASTER_SHEET_DOWNLOAD_ITEMS: SourceDownloadItem[] =
  EXPECTED_MASTER_SHEET_FILES.map((name) => ({
    kind: "master" as const,
    id: name,
    label: name,
  }));

export function buildSourceDownloadUrl(
  item: SourceDownloadItem,
  reportDate: string,
  uploadToken?: string,
): string {
  const params = new URLSearchParams({
    kind: item.kind,
    id: item.id,
    date: reportDate,
  });
  if (uploadToken?.trim()) {
    params.set("uploadToken", uploadToken.trim());
  }
  return `/api/master-sheets/download?${params.toString()}`;
}
