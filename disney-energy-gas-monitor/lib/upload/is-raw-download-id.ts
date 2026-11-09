import { EXPECTED_RAW_LOGICAL_IDS } from "@/lib/expected-raw-logical-ids";
import { HCCP_GAS_CAPACITY_LOGICAL_ID } from "@/lib/raw-data-config";
import { RAW_CONVERSION_FEED_IN_MASTER } from "@/lib/upload/batch-classifier";

export function isRawDownloadId(id: string): boolean {
  if (id === HCCP_GAS_CAPACITY_LOGICAL_ID) return true;
  if (id === RAW_CONVERSION_FEED_IN_MASTER) return true;
  return (EXPECTED_RAW_LOGICAL_IDS as readonly string[]).includes(id);
}
