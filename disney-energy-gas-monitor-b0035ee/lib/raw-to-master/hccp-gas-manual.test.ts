import assert from "node:assert/strict";
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { excelSerialToDate } from "@/lib/datastore/parsers/excel-utils";
import { applyHccpGasManualFields } from "@/lib/raw-to-master/hccp-gas";
import { computeHccpOverallOccupancy } from "@/lib/raw-to-master/hccp-gas-manual";

const REFERENCE_MASTER =
  "/home/ubuntu/.cursor/projects/workspace/uploads/HCCP_Gas_Consumption_report_c4ac.xlsx";

test("computeHccpOverallOccupancy matches master formula sample", () => {
  const value = computeHccpOverallOccupancy(0, 75.07, 75.63);
  assert.ok(Math.abs(value - 58.103142857142856) < 0.0001);
});

test("overall occupancy in master matches D/E/F for Nov 2026", async () => {
  const wb = XLSX.readFile(REFERENCE_MASTER, { cellDates: false });
  const sheet = wb.Sheets["Gas Meter Reading"]!;
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  let checked = 0;
  let failures = 0;

  for (let r = range.s.r; r <= range.e.r; r += 1) {
    const rowNum = r + 1;
    const dateCell = sheet[`A${rowNum}`];
    if (!dateCell || typeof dateCell.v !== "number") continue;
    const iso = excelSerialToDate(dateCell.v);
    if (!iso || iso < "2026-11-01" || iso > "2026-11-30") continue;

    const dlh = Number(sheet[`D${rowNum}`]?.v);
    const del = Number(sheet[`E${rowNum}`]?.v);
    const dhh = Number(sheet[`F${rowNum}`]?.v);
    const overall = Number(sheet[`G${rowNum}`]?.v);
    if (![dlh, del, dhh, overall].every(Number.isFinite)) continue;

    checked += 1;
    const expected = computeHccpOverallOccupancy(dlh, del, dhh);
    if (Math.abs(expected - overall) > 0.0001) {
      failures += 1;
      console.log(
        `mismatch ${iso}: overall ${overall} vs computed ${expected}`,
      );
    }
  }

  assert.ok(
    checked >= 8,
    "expected at least the filled November rows in the reference master",
  );
  assert.equal(failures, 0);
});

test("apply manual fields and append Dec row with formulas", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "hccp-gas-manual-"));
  const masterPath = path.join(dir, "HCCP_Gas_Consumption_report.xlsx");
  await copyFile(REFERENCE_MASTER, masterPath);

  await applyHccpGasManualFields({
    masterWorkbookPath: masterPath,
    consumptionDate: "2026-12-01",
    fields: {
      ballroomUtilization: 5,
      dlhOccupancy: 80,
      delOccupancy: 70,
      dhhOccupancy: 65,
      atten: 18,
    },
  });

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(masterPath);
  const sheet = wb.getWorksheet("Gas Meter Reading")!;
  let rowNum: number | null = null;
  sheet.eachRow((row, n) => {
    const v = row.getCell(1).value;
    if (v instanceof Date && v.toISOString().slice(0, 10) === "2026-12-01") {
      rowNum = n;
    }
  });
  assert.ok(rowNum);
  const row = sheet.getRow(rowNum!);
  assert.equal(row.getCell(3).value, 5);
  assert.equal(row.getCell(12).value, 18);
  const b = row.getCell(2).value;
  assert.ok(b && typeof b === "object" && "formula" in b);
  assert.match(String((b as { formula: string }).formula), /AND\(A\d+/);
  const g = row.getCell(7).value;
  assert.ok(g && typeof g === "object" && "formula" in g);
  assert.match(String((g as { formula: string }).formula), /1750/);

  await rm(dir, { recursive: true, force: true });
});
