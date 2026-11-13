import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { insertSheetRowAfterExcel } from "@/lib/master-editor/top-10-sheet-mutate-excel";
import {
  loadExcelWorkbook,
  saveExcelWorkbook,
} from "@/lib/raw-to-master/exceljs-preserve";
import {
  buildWebSsRowIndexExcel,
  getWebSsSheet,
} from "@/lib/raw-to-master/top-10-excel";

const MASTER = join(
  process.cwd(),
  "data/master-sheets/HKDL_Top_10.xlsx",
);

test("insert row preserves workbook sheets and date column formatting", async () => {
  const dir = mkdtempSync(join(tmpdir(), "t10-editor-"));
  const copyPath = join(dir, "HKDL_Top_10.xlsx");
  copyFileSync(MASTER, copyPath);

  const beforeWb = await loadExcelWorkbook(copyPath);
  const sheetNamesBefore = beforeWb.worksheets.map((w) => w.name);

  const wb = await loadExcelWorkbook(copyPath);
  const sheet = getWebSsSheet(wb);
  const index = buildWebSsRowIndexExcel(sheet);
  const anchorRow = [...index.values()].sort((a, b) => a - b)[0]!;
  const sampleNumFmt = sheet.getRow(anchorRow).getCell(3).numFmt;

  const newRow = insertSheetRowAfterExcel(sheet, anchorRow);
  sheet.getRow(newRow).getCell(1).value = "CURSOR_TEST_METER";
  sheet.getRow(newRow).getCell(2).value = "Test location";

  await saveExcelWorkbook(wb, copyPath);

  const afterWb = await loadExcelWorkbook(copyPath);
  assert.deepEqual(
    afterWb.worksheets.map((w) => w.name),
    sheetNamesBefore,
  );
  const afterSheet = getWebSsSheet(afterWb);
  assert.equal(
    afterSheet.getRow(newRow).getCell(1).value,
    "CURSOR_TEST_METER",
  );
  const newRowNumFmt = afterSheet.getRow(newRow).getCell(3).numFmt;
  if (sampleNumFmt) {
    assert.equal(newRowNumFmt, sampleNumFmt);
  }
});
