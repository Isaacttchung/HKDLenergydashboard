import { extractRawBatchDataDate, timestampCellToDataDate } from "@/lib/upload/extract-batch-data-date";
import Papa from "papaparse";

export interface RawDateMismatchDetail {
  logicalId: string;
  dataDate: string | null;
}

/** Blocking: every staged raw CSV must share the same calendar date. */
export function validateRawBatchDateConsistency(
  csvByLogicalId: Record<string, string>,
): { ok: true; dataDate: string } | { ok: false; error: string; details: RawDateMismatchDetail[] } {
  const details: RawDateMismatchDetail[] = [];
  let expected: string | null = null;

  for (const [logicalId, content] of Object.entries(csvByLogicalId)) {
    const parsed = Papa.parse<string[]>(content, {
      header: false,
      skipEmptyLines: true,
    });
    let fileDate: string | null = null;
    if (parsed.data.length >= 2) {
      const header = parsed.data[0].map((c) => String(c ?? "").trim());
      const tsCol = header.findIndex((h) => /^timestamp$/i.test(h));
      const col = tsCol >= 0 ? tsCol : 0;
      fileDate = timestampCellToDataDate(parsed.data[1][col]);
    }
    details.push({ logicalId, dataDate: fileDate });
    if (!fileDate) continue;
    if (expected === null) expected = fileDate;
    else if (expected !== fileDate) {
      return {
        ok: false,
        error: "Raw CSV Timestamp dates do not match across the batch",
        details,
      };
    }
  }

  const batchDate = extractRawBatchDataDate(Object.values(csvByLogicalId));
  if (!batchDate) {
    return {
      ok: false,
      error: "Could not derive a single data date from raw CSV Timestamp columns",
      details,
    };
  }

  return { ok: true, dataDate: batchDate };
}
