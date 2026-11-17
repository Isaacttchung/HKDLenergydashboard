import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import JSZip from "jszip";
import { clearPristineWorkbookCacheForTests } from "@/lib/raw-to-master/exceljs-workbook-merge";
import {
  loadExcelWorkbook,
  saveExcelWorkbook,
} from "@/lib/raw-to-master/exceljs-preserve";
import {
  ensurePowerSolarDateRow,
  getPowerSolarSheet,
} from "@/lib/raw-to-master/power-solar-excel";
import { POWER_SOLAR_SHEET_CONFIG } from "@/lib/raw-to-master/power-solar-mappings";

const MASTER = join(
  process.cwd(),
  "data/master-sheets/HKDL_Power_Solar_consumption_report.xlsx",
);

async function ccpLastDateSerial(path: string): Promise<number | null> {
  const zip = await JSZip.loadAsync(readFileSync(path));
  const wb = await zip.file("xl/workbook.xml")!.async("string");
  const rel = await zip.file("xl/_rels/workbook.xml.rels")!.async("string");
  const rid = Object.fromEntries(
    [...rel.matchAll(/Id="([^"]+)"[^>]+Target="([^"]+)"/g)].map((m) => [
      m[1]!,
      m[2]!.replace(/^\/xl\//, "").replace(/^\//, ""),
    ]),
  );
  const sheetRef = wb.match(/name="CCP"[^>]+r:id="([^"]+)"/)![1]!;
  const xml = await zip.file(`xl/${rid[sheetRef]}`)!.async("string");
  const last = Number(xml.match(/dimension ref="[^"]*:[A-Z]+(\d+)"/)![1]);
  const v = xml.match(new RegExp(`<c r="A${last}"[^>]*><v>(\\d+)</v>`));
  return v ? Number(v[1]) : null;
}

test("reload refreshes pristine baseline so partial saves keep other sheets", async () => {
  clearPristineWorkbookCacheForTests();
  const dir = mkdtempSync(join(tmpdir(), "ps-pristine-"));
  const copy = join(dir, "master.xlsx");
  copyFileSync(MASTER, copy);

  const iso = "2026-11-25";

  const wb1 = await loadExcelWorkbook(copy);
  const ccp1 = getPowerSolarSheet(wb1, "CCP");
  ensurePowerSolarDateRow(
    ccp1,
    iso,
    POWER_SOLAR_SHEET_CONFIG.CCP.headerRowIndex + 1,
  );
  await saveExcelWorkbook(wb1, copy, ["CCP"]);
  const serial = await ccpLastDateSerial(copy);
  assert.ok(serial !== null && serial > 46300);

  const wb2 = await loadExcelWorkbook(copy);
  const hotel = getPowerSolarSheet(wb2, "Hotel");
  ensurePowerSolarDateRow(
    hotel,
    iso,
    POWER_SOLAR_SHEET_CONFIG.Hotel.headerRowIndex + 1,
  );
  await saveExcelWorkbook(wb2, copy, ["Hotel"]);

  assert.equal(
    await ccpLastDateSerial(copy),
    serial,
    "CCP row must survive Hotel-only save after reload",
  );
  clearPristineWorkbookCacheForTests();
});