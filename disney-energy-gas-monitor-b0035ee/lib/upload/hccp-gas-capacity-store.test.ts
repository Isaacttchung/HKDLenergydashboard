import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import {
  loadHccpGasCapacityCsvTextsForConsumption,
  monthKeysSpanningConsumption,
  previousMonthKey,
  pruneHccpGasCapacityArchive,
  saveHccpGasCapacityUpload,
  shouldKeepPriorMonthArchive,
} from "@/lib/upload/hccp-gas-capacity-store";
import {
  computeHccpGasConsumptionForDate,
  mergeHccpGasMidnightMaps,
  parseHccpGasCapacityMidnights,
} from "@/lib/raw-to-master/hccp-gas";

let tmpDir = "";

before(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "hccp-gas-archive-"));
  process.env.HCCP_GAS_CAPACITY_ARCHIVE_DIR = tmpDir;
  await mkdir(tmpDir, { recursive: true });
});

after(async () => {
  delete process.env.HCCP_GAS_CAPACITY_ARCHIVE_DIR;
  await rm(tmpDir, { recursive: true, force: true });
});

const NOV_SNIPPET = `"Time","B","C"
"11/08/2026 00:00:00","13,119.0","25,150.0"
"11/09/2026 00:00:00","14,236.0","26,127.0"`;

const OCT_SNIPPET = `"Time","B","C"
"10/31/2026 00:00:00","12,000.0","24,000.0"`;

const NOV_BOUNDARY = `"Time","B","C"
"11/01/2026 00:00:00","12,100.0","24,100.0"`;

test("shouldKeepPriorMonthArchive through 2nd only", () => {
  assert.equal(shouldKeepPriorMonthArchive("2026-11-01"), true);
  assert.equal(shouldKeepPriorMonthArchive("2026-11-02"), true);
  assert.equal(shouldKeepPriorMonthArchive("2026-11-03"), false);
});

test("monthKeysSpanningConsumption crosses month boundary on last day of month", () => {
  assert.deepEqual(monthKeysSpanningConsumption("2026-10-31"), [
    "2026-10",
    "2026-11",
  ]);
  assert.deepEqual(monthKeysSpanningConsumption("2026-11-08"), ["2026-11"]);
});

test("prune keeps prior month through the 2nd", async () => {
  const octPath = path.join(tmpDir, "HCCP_Gas_Capacity_2026-10.csv");
  const novPath = path.join(tmpDir, "HCCP_Gas_Capacity_2026-11.csv");
  const sepPath = path.join(tmpDir, "HCCP_Gas_Capacity_2026-09.csv");
  await writeFile(octPath, OCT_SNIPPET, "utf-8");
  await writeFile(novPath, NOV_SNIPPET, "utf-8");
  await writeFile(sepPath, OCT_SNIPPET, "utf-8");

  const removedOn2nd = await pruneHccpGasCapacityArchive("2026-11-02");
  assert.ok(!removedOn2nd.includes("HCCP_Gas_Capacity_2026-10.csv"));
  assert.ok(removedOn2nd.includes("HCCP_Gas_Capacity_2026-09.csv"));

  const removedOn3rd = await pruneHccpGasCapacityArchive("2026-11-03");
  assert.ok(removedOn3rd.includes("HCCP_Gas_Capacity_2026-10.csv"));
  await readFile(novPath, "utf-8");
});

test("save writes month archive from midnight rows", async () => {
  const { monthKey, filename } = await saveHccpGasCapacityUpload(NOV_SNIPPET);
  assert.equal(monthKey, "2026-11");
  assert.equal(filename, "HCCP_Gas_Capacity_2026-11.csv");
  assert.equal(previousMonthKey("2026-11"), "2026-10");
});

test("load merges archived prior month for Oct 31 consumption", async () => {
  await writeFile(
    path.join(tmpDir, "HCCP_Gas_Capacity_2026-10.csv"),
    OCT_SNIPPET,
    "utf-8",
  );
  const texts = await loadHccpGasCapacityCsvTextsForConsumption(
    "2026-10-31",
    NOV_BOUNDARY,
  );
  const merged = mergeHccpGasMidnightMaps(
    texts.map(parseHccpGasCapacityMidnights),
  );
  const row = computeHccpGasConsumptionForDate(merged, "2026-10-31");
  assert.ok(row);
  assert.equal(row.meter1, 100);
  assert.equal(row.meter2, 100);
});
