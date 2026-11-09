import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import {
  computeHccpGasConsumptionForDate,
  convertHccpGasMaster,
  hccpGasMeterDelta,
  parseHccpGasCapacityMidnights,
} from "@/lib/raw-to-master/hccp-gas";

const CAPACITY_CSV =
  "/home/ubuntu/.cursor/projects/workspace/uploads/HCCP_Gas_Capacity_8a05.csv";
const REFERENCE_MASTER =
  "/home/ubuntu/.cursor/projects/workspace/uploads/HCCP_Gas_Consumption_report_c4ac.xlsx";

test("hccpGasMeterDelta handles 65536 wrap", () => {
  assert.equal(hccpGasMeterDelta(64_490, 340), 65536 - 64_490 + 340);
  assert.equal(hccpGasMeterDelta(13_119, 14_236), 1_117);
});

test("Nov 8 2026 consumption matches reference master", async () => {
  const csv = await readFile(CAPACITY_CSV, "utf-8");
  const midnights = parseHccpGasCapacityMidnights(csv);
  const nov8 = computeHccpGasConsumptionForDate(midnights, "2026-11-08");
  assert.ok(nov8);
  assert.equal(nov8.meter1, 1_117);
  assert.equal(nov8.meter2, 977);
  assert.equal(nov8.gasConsumptionUnits, 2_094);

  const nov7 = computeHccpGasConsumptionForDate(midnights, "2026-11-07");
  assert.ok(nov7);
  assert.equal(nov7.meter1, 1_149);
  assert.equal(nov7.meter2, 1_011);
  assert.equal(nov7.gasConsumptionUnits, 2_160);

  const wb = XLSX.readFile(REFERENCE_MASTER);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    wb.Sheets["Gas Meter Reading"]!,
    { defval: "" },
  );
  const row8 = rows.find((r) => {
    const d = r.Date;
    if (typeof d !== "number") return false;
    const iso = new Date(Date.UTC(1899, 11, 30) + d * 86_400_000)
      .toISOString()
      .slice(0, 10);
    return iso === "2026-11-08";
  });
  assert.ok(row8);
  const meter1Key = Object.keys(row8).find((k) => k.startsWith("Meter 1"))!;
  const meter2Key = Object.keys(row8).find((k) => k.startsWith("Meter 2"))!;
  assert.equal(Number(row8[meter1Key]), nov8.meter1);
  assert.equal(Number(row8[meter2Key]), nov8.meter2);
  assert.equal(Number(row8["Gas Consumption (Units)"]), nov8.gasConsumptionUnits);
});

test("convertHccpGasMaster writes columns I/J/K on Gas Meter Reading", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "hccp-gas-"));
  const masterPath = path.join(dir, "HCCP_Gas_Consumption_report.xlsx");
  await copyFile(REFERENCE_MASTER, masterPath);
  const csv = await readFile(CAPACITY_CSV, "utf-8");

  const result = await convertHccpGasMaster({
    capacityCsvTexts: [csv],
    masterWorkbookPath: masterPath,
    consumptionDate: "2026-11-08",
  });

  assert.equal(result.meter1, 1_117);
  assert.equal(result.meter2, 977);
  assert.equal(result.gasConsumptionUnits, 2_094);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(masterPath);
  const sheet = wb.getWorksheet("Gas Meter Reading")!;
  let excelRow = 0;
  sheet.eachRow((row, rowNumber) => {
    const v = row.getCell(1).value;
    if (v instanceof Date && v.toISOString().slice(0, 10) === "2026-11-08") {
      excelRow = rowNumber;
    }
  });
  assert.ok(excelRow > 0);
  const dataRow = sheet.getRow(excelRow);
  assert.equal(dataRow.getCell(9).value, 1_117);
  assert.equal(dataRow.getCell(10).value, 977);
  const kVal = dataRow.getCell(11).value;
  if (typeof kVal === "number") {
    assert.equal(kVal, 2_094);
  } else if (kVal && typeof kVal === "object" && "formula" in kVal) {
    assert.match(String((kVal as { formula: string }).formula), /I\d+\+J\d+/);
  } else {
    assert.fail(`Unexpected K cell: ${JSON.stringify(kVal)}`);
  }

  await rm(dir, { recursive: true, force: true });
});
