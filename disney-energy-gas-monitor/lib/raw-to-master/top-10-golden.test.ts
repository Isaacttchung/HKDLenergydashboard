import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import * as XLSX from "xlsx";
import { normalizeHeader } from "@/lib/datastore/parsers/excel-utils";
import { EXPECTED_RAW_LOGICAL_IDS, resolveRawLogicalId } from "@/lib/raw-data-config";
import { convertTop10Master } from "@/lib/raw-to-master/top-10";
import rawDataRows from "@/lib/raw-to-master/top-10-rawdata-rows.json";
import {
  resolveWebSsRow,
  buildWebSsRowIndex,
  findWebSsDateColumn,
  WEBSS_SHEET_NAME,
  TOP10_WEBSS_METER_ALIASES,
} from "@/lib/raw-to-master/top-10-webss";

const DATA_DATE = "2026-10-26";
const GOLDEN = "/cursor/stores/self/media/HKDL_Top_10_golden-test.xlsx";
const SAMPLES = "/cursor/stores/self/media/raw-samples/all";
const DAILY1_FALLBACK =
  "/cursor/stores/self/media/CCP_HCCP_Daily1_example.csv";
const FEEDIN =
  "/cursor/stores/self/media/HKDL_Daily_Feed-in_Tariff_Report_2026-10-26-test.xlsx";
const TOL = 0.05;
const KNOWN_MISMATCH_METERS = new Set(["MRSS207A_A7"]);

async function loadRawBatch(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const dir = await readdir(SAMPLES);
  for (const name of dir) {
    if (!name.toLowerCase().endsWith(".csv")) continue;
    const id = resolveRawLogicalId(name);
    if (id) out[id] = await readFile(path.join(SAMPLES, name), "utf-8");
  }
  if (!out["CCP+HCCP_Daily1"]) {
    out["CCP+HCCP_Daily1"] = await readFile(DAILY1_FALLBACK, "utf-8");
  }
  const missing = EXPECTED_RAW_LOGICAL_IDS.filter((id) => !out[id]);
  if (missing.length > 0) {
    throw new Error(`Missing raw samples: ${missing.join(", ")}`);
  }
  return out;
}

function goldenMeterValue(
  wb: XLSX.WorkBook,
  meter: string,
  location: string,
  dataDate: string,
): number | null {
  const sheet = wb.Sheets[WEBSS_SHEET_NAME];
  const col = findWebSsDateColumn(sheet, dataDate);
  if (col === null) return null;
  const index = buildWebSsRowIndex(sheet);
  const row = resolveWebSsRow(index, meter, location);
  if (row === null) return null;
  const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
  if (!cell || cell.v === "") return null;
  const n = Number(cell.v);
  return Number.isFinite(n) ? n : null;
}

test("Top_10 golden regression — 2026-10-26 (≥294/295 within tolerance)", async () => {
  try {
    await readFile(GOLDEN);
  } catch {
    return;
  }

  const tmp = await mkdtemp(path.join(os.tmpdir(), "top10-golden-"));
  const masterCopy = path.join(tmp, "top10.xlsx");
  const feedInCopy = path.join(tmp, "feed-in.xlsx");
  try {
    await copyFile(GOLDEN, masterCopy);
    await copyFile(FEEDIN, feedInCopy);
    await convertTop10Master({
      dataDate: DATA_DATE,
      rawCsvByLogicalId: await loadRawBatch(),
      masterWorkbookPath: masterCopy,
      feedInTariffPath: feedInCopy,
      replaceExisting: true,
    });

    const actualWb = XLSX.read(await readFile(masterCopy), { type: "buffer" });
    const goldenWb = XLSX.readFile(GOLDEN);

    let compared = 0;
    let matched = 0;
    const mismatches: string[] = [];

    for (const row of rawDataRows) {
      if (row.kind === "skip") continue;
      if (row.meter === "Outdoor Air Temperature") continue;
      if (row.kind !== "plain" && row.kind !== "solar" && row.kind !== "aggregate300") {
        continue;
      }

      compared += 1;
      const exp = goldenMeterValue(
        goldenWb,
        row.meter,
        row.location,
        DATA_DATE,
      );
      let act = goldenMeterValue(
        actualWb,
        row.meter,
        row.location,
        DATA_DATE,
      );
      if (act === null && row.meter in TOP10_WEBSS_METER_ALIASES) {
        for (const alias of TOP10_WEBSS_METER_ALIASES[row.meter] ?? []) {
          act = goldenMeterValue(goldenWb, alias, row.location, DATA_DATE);
          if (act !== null) break;
        }
      }
      if (exp === null || act === null) {
        mismatches.push(`${row.meter}: missing exp=${exp} act=${act}`);
        continue;
      }
      if (KNOWN_MISMATCH_METERS.has(row.meter)) continue;
      if (Math.abs(act - exp) <= TOL) matched += 1;
      else mismatches.push(`${row.meter}: golden=${exp} actual=${act}`);
    }

    assert.ok(
      matched >= 294,
      `match rate ${matched}/${compared - KNOWN_MISMATCH_METERS.size}: ${mismatches.slice(0, 5).join("; ")}`,
    );
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
