import { readdir } from "fs/promises";
import path from "path";
import { RAW_DATA_DIR, resolveRawLogicalId } from "@/lib/raw-data-config";

/** Find staged raw CSV path on disk for a logical id. */
export async function resolveStagedRawFilePath(
  logicalId: string,
): Promise<string | null> {
  let entries: string[];
  try {
    entries = await readdir(RAW_DATA_DIR);
  } catch {
    return null;
  }

  for (const name of entries) {
    if (!name.toLowerCase().endsWith(".csv")) continue;
    if (resolveRawLogicalId(name) === logicalId) {
      return path.join(RAW_DATA_DIR, name);
    }
  }
  return null;
}
