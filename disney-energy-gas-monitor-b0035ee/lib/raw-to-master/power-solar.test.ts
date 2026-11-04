import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import * as XLSX from "xlsx";
import {
  convertPowerSolarMaster,
  readPowerSolarMeterValue,
} from "@/lib/raw-to-master/power-solar";
import { FeedInTariffLookup } from "@/lib/raw-to-master/feed-in-tariff-lookup";

const REPO_ROOT = path.join(import.meta.dirname, "../..");
const STORE_SAMPLES = "/cursor/stores/self/media/raw-samples/all";
const FEED_IN_SAMPLE =
  "/cursor/stores/self/media/HKDL_Daily_Feed-in_Tariff_Report_2026-10-26-test.xlsx";
const DATA_DATE = "2026-10-26";

async function loadMercuryRaws(): Promise<Record<string, string>> {
  const ids = [
    "Mercury_CCP",
    "Mercury_HCCP",
    "Mercury_Hotel",
    "Mercury_Park",
  ] as const;
  const out: Record<string, string> = {};
  for (const id of ids) {
    const dir = await import("node:fs/promises").then((fs) =>
      fs.readdir(STORE_SAMPLES),
    );
    const match = dir.find((f) => f.startsWith(`${id}_`));
    assert.ok(match, `sample ${id} under ${STORE_SAMPLES}`);
    out[id] = await readFile(path.join(STORE_SAMPLES, match), "utf-8");
  }
  return out;
}

test("FeedInTariffLookup matches batch data_date row", async () => {
  const buffer = await readFile(FEED_IN_SAMPLE);
  const lookup = FeedInTariffLookup.fromBuffer(buffer);
  lookup.requireDataDate(DATA_DATE);
  assert.equal(lookup.sumFeedInForColumns(DATA_DATE, ["AG"]), 119.1);
  assert.equal(
    lookup.sumFeedInForColumns(DATA_DATE, ["AI", "AJ"]),
    182.18,
  );
});

test("convertPowerSolarMaster writes CHHP Solar Consumption for 2026-10-26 samples", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "power-solar-test-"));
  const masterCopy = path.join(tmp, "HKDL_Power_Solar_consumption_report.xlsx");
  const feedInCopy = path.join(tmp, "feed-in.xlsx");
  try {
    await copyFile(
      path.join(REPO_ROOT, "data/master-sheets/HKDL_Power_Solar_consumption_report.xlsx"),
      masterCopy,
    );
    await copyFile(FEED_IN_SAMPLE, feedInCopy);

    const rawCsvByLogicalId = await loadMercuryRaws();
    const result = await convertPowerSolarMaster({
      dataDate: DATA_DATE,
      rawCsvByLogicalId,
      masterWorkbookPath: masterCopy,
      feedInTariffPath: feedInCopy,
    });

    assert.equal(result.dataDate, DATA_DATE);
    assert.equal(result.metersWritten, 45);
    assert.deepEqual(result.areasUpdated.sort(), ["CCP", "HCCP", "Hotel", "Park"]);

    const wb = XLSX.read(await readFile(masterCopy), { type: "buffer" });
    const hccp303a = readPowerSolarMeterValue(
      wb,
      "HCCP",
      DATA_DATE,
      "SS303A_TxA (kWh)",
    );
    assert.ok(hccp303a !== null && Math.abs(hccp303a - 738.18) < 0.01);
    const ccp205a = readPowerSolarMeterValue(
      wb,
      "CCP",
      DATA_DATE,
      "SS205A_TxA (kWh)",
    );
    assert.ok(ccp205a !== null && Math.abs(ccp205a - 11329.475) < 0.01);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
