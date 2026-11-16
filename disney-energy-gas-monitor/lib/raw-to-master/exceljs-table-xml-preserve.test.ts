import assert from "node:assert/strict";
import { execSync } from "child_process";
import { copyFileSync, mkdtempSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { test } from "node:test";
import {
  ensureGasMeterRow,
  getGasMeterSheet,
  writeGasMeterConsumption,
} from "@/lib/raw-to-master/hccp-gas-excel";
import { loadExcelWorkbook, saveExcelWorkbook } from "@/lib/raw-to-master/exceljs-preserve";

const GAS_MASTER = join(
  process.cwd(),
  "data/master-sheets/HCCP_Gas_Consumption_report.xlsx",
);

test("gas save preserves full 11-column table XML", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gas-table-xml-"));
  const copyPath = join(dir, "gas.xlsx");
  copyFileSync(GAS_MASTER, copyPath);

  const wb = await loadExcelWorkbook(copyPath);
  const sheet = getGasMeterSheet(wb);
  const rowNum = ensureGasMeterRow(sheet, "2026-11-11", copyPath);
  writeGasMeterConsumption(sheet.getRow(rowNum), rowNum, {
    consumptionDate: "2026-11-11",
    meter1: 100,
    meter2: 200,
    gasConsumptionUnits: 300,
  });
  await saveExcelWorkbook(wb, copyPath, ["Gas Meter Reading"]);

  const unzip = join(dir, "unz");
  execSync(`rm -rf "${unzip}" && mkdir -p "${unzip}" && unzip -q "${copyPath}" -d "${unzip}"`);
  const tableXml = readFileSync(join(unzip, "xl/tables/table1.xml"), "utf8");
  assert.match(tableXml, /tableColumn id="7".*Gas Consumption/);
  assert.match(tableXml, /ref="A1:K3047"/);
  assert.doesNotMatch(tableXml, /tableColumns count="2"/);
});