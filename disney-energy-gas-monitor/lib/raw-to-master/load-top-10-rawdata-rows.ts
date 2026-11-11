import { readFileSync, statSync } from "fs";
import path from "path";
import bundled from "@/lib/raw-to-master/top-10-rawdata-rows.json";

export type Top10RawDataRow = (typeof bundled)[number];

const OVERRIDE_PATH = path.join(
  process.cwd(),
  "data",
  "master-schema",
  "top-10-rawdata-rows.json",
);

let cache: { mtimeMs: number; rows: Top10RawDataRow[] } | null = null;

export function top10RawDataRowsOverridePath(): string {
  return OVERRIDE_PATH;
}

export function getTop10RawDataRows(): Top10RawDataRow[] {
  try {
    const stat = statSync(OVERRIDE_PATH);
    if (cache && cache.mtimeMs === stat.mtimeMs) {
      return cache.rows;
    }
    const parsed = JSON.parse(
      readFileSync(OVERRIDE_PATH, "utf-8"),
    ) as Top10RawDataRow[];
    cache = { mtimeMs: stat.mtimeMs, rows: parsed };
    return parsed;
  } catch {
    return bundled as Top10RawDataRow[];
  }
}

export function mappingSource(): "override" | "bundled" {
  try {
    statSync(OVERRIDE_PATH);
    return "override";
  } catch {
    return "bundled";
  }
}

/** Invalidate after editor writes (same process). */
export function clearTop10RawDataRowsCache(): void {
  cache = null;
}
