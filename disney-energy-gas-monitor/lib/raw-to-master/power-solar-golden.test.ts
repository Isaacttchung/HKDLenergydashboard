import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import * as XLSX from "xlsx";
import { normalizeHeader } from "@/lib/datastore/parsers/excel-utils";
import {
  convertPowerSolarMaster,
  readPowerSolarMeterValue,
} from "@/lib/raw-to-master/power-solar";
import {
  HOTEL_PROPERTY_SUBTOTALS,
  POWER_SOLAR_METER_MAPPINGS,
} from "@/lib/raw-to-master/power-solar-mappings";

const DATA_DATE = "2026-10-26";
const GOLDEN =
  "/cursor/stores/self/media/HKDL_Power_Solar_golden-test.xlsx";
const SAMPLES = "/cursor/stores/self/media/raw-samples/all";
const FEEDIN =
  "/cursor/stores/self/media/HKDL_Daily_Feed-in_Tariff_Report_2026-10-26-test.xlsx";
const TOL = 0.05;

const DATE_SERIAL =
  (Date.UTC(2026, 9, 26) - Date.UTC(1899, 11, 30)) / 86_400_000;

async function loadMercuryRaws(): Promise<Record<string, string>> {
  const ids = [
    "Mercury_CCP",
    "Mercury_HCCP",
    "Mercury_Hotel",
    "Mercury_Park",
  ];
  const out: Record<string, string> = {};
  const dir = await readdir(SAMPLES);
  for (const id of ids) {
    const match = dir.find((f) => f.startsWith(`${id}_`));
    assert.ok(match, `sample ${id}`);
    out[id] = await readFile(path.join(SAMPLES, match), "utf-8");
  }
  return out;
}

function goldenRowMap(
  wb: XLSX.WorkBook,
  area: string,
): { map: Map<string, number>; row: number } {
  const sh = wb.Sheets[area];
  const hr = area === "Hotel" ? 1 : 0;
  const range = XLSX.utils.decode_range(sh["!ref"] ?? "A1");
  let row = -1;
  for (let r = hr + 1; r <= range.e.r; r += 1) {
    if (sh[XLSX.utils.encode_cell({ r, c: 0 })]?.v === DATE_SERIAL) {
      row = r;
      break;
    }
  }
  assert.ok(row >= 0, `golden date row on ${area}`);
  const map = new Map<string, number>();
  for (let c = 0; c <= range.e.c; c += 1) {
    const h = sh[XLSX.utils.encode_cell({ r: hr, c })]?.v;
    if (!h || h === "Date") continue;
    const v = sh[XLSX.utils.encode_cell({ r: row, c })]?.v;
    if (v === "" || v == null || v === true) continue;
    const n = Number(v);
    if (Number.isFinite(n)) {
      map.set(normalizeHeader(String(h).replace(/\r?\n/g, " ")), n);
    }
  }
  return { map, row };
}

function readAreaTotal(wb: XLSX.WorkBook, area: string): number {
  const { map } = goldenRowMap(wb, area);
  for (const [k, v] of map) {
    if (k.includes("total power consumption")) return v;
  }
  throw new Error(`no total on ${area}`);
}

test("Power_Solar golden regression — 2026-10-26 Mercury batch", async () => {
  try {
    await readFile(GOLDEN);
  } catch {
    return; // golden not mounted in this environment
  }

  const tmp = await mkdtemp(path.join(os.tmpdir(), "ps-golden-test-"));
  const masterCopy = path.join(tmp, "master.xlsx");
  const feedInCopy = path.join(tmp, "feed-in.xlsx");
  try {
    await copyFile(GOLDEN, masterCopy);
    await copyFile(FEEDIN, feedInCopy);
    await convertPowerSolarMaster({
      dataDate: DATA_DATE,
      rawCsvByLogicalId: await loadMercuryRaws(),
      masterWorkbookPath: masterCopy,
      feedInTariffPath: feedInCopy,
    });

    const actualWb = XLSX.read(await readFile(masterCopy), { type: "buffer" });
    const goldenWb = XLSX.readFile(GOLDEN);

    for (const m of POWER_SOLAR_METER_MAPPINGS) {
      const exp = goldenRowMap(goldenWb, m.area).map.get(
        normalizeHeader(m.masterColumnHeader),
      );
      const act = readPowerSolarMeterValue(
        actualWb,
        m.area,
        DATA_DATE,
        m.masterColumnHeader,
      );
      assert.ok(exp != null && act != null, `${m.masterColumnHeader} present`);
      assert.ok(
        Math.abs(act - exp) <= TOL,
        `${m.area}/${m.masterColumnHeader} golden=${exp} actual=${act}`,
      );
    }

    for (const area of ["CCP", "HCCP", "Hotel", "Park"] as const) {
      const exp = readAreaTotal(goldenWb, area);
      const act = readAreaTotal(actualWb, area);
      assert.ok(
        Math.abs(act - exp) <= TOL,
        `${area} total golden=${exp} actual=${act}`,
      );
    }

    const hotelGolden = goldenRowMap(goldenWb, "Hotel");
    for (const group of HOTEL_PROPERTY_SUBTOTALS) {
      const exp = hotelGolden.map.get(normalizeHeader(group.subtotalHeader));
      assert.ok(exp != null, group.subtotalHeader);
      let sum = 0;
      for (const meterHeader of group.meterHeaders) {
        const v = readPowerSolarMeterValue(
          actualWb,
          "Hotel",
          DATA_DATE,
          meterHeader,
        );
        assert.ok(v != null, meterHeader);
        sum += v;
      }
      assert.ok(
        Math.abs(sum - exp) <= TOL,
        `${group.subtotalHeader} golden=${exp} sum=${sum}`,
      );
      const actSub = readPowerSolarMeterValue(
        actualWb,
        "Hotel",
        DATA_DATE,
        group.subtotalHeader,
      );
      assert.ok(
        actSub != null && Math.abs(actSub - exp) <= TOL,
        `written ${group.subtotalHeader}`,
      );
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
