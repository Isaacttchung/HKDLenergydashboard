import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadExcelWorkbook } from "@/lib/raw-to-master/exceljs-preserve";

const POWER_SOLAR = path.join(
  process.cwd(),
  "data/master-sheets/HKDL_Power_Solar_consumption_report.xlsx",
);

test("ExcelJS loads Power Solar master (table autoFilter patch)", async () => {
  const wb = await loadExcelWorkbook(POWER_SOLAR);
  assert.ok(wb.worksheets.length >= 4);
  assert.ok(wb.getWorksheet("Park"));
  assert.ok(wb.getWorksheet("Hotel"));
});