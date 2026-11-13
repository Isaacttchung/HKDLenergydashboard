import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import * as XLSX from "xlsx";
import {
  chhpRowKey,
  parseChhpSheet,
} from "@/lib/raw-to-master/parse-chhp-sheet";
import { POWER_SOLAR_METER_MAPPINGS } from "@/lib/raw-to-master/power-solar-mappings";

const FORMULA_FIXTURES = [
  path.join(process.cwd(), "test/fixtures/Formula-DailyWeb4.xlsm"),
  "/home/ubuntu/.cursor/projects/workspace/uploads/Formula_-_DailyWeb4_54f6.xlsm",
];

function resolveFormulaWorkbookPath(): string | null {
  for (const candidate of FORMULA_FIXTURES) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

test("POWER_SOLAR_METER_MAPPINGS stays in sync with Formula-DailyWeb4 CHHP sheet", () => {
  const workbookPath = resolveFormulaWorkbookPath();
  if (!workbookPath) {
    console.log("skip: Formula-DailyWeb4.xlsm not on disk");
    return;
  }

  const workbook = XLSX.read(readFileSync(workbookPath), {
    type: "buffer",
    cellFormula: true,
  });
  const fromChhp = parseChhpSheet(workbook);
  const chhpByKey = new Map(fromChhp.map((row) => [chhpRowKey(row), row]));
  const codeByKey = new Map(
    POWER_SOLAR_METER_MAPPINGS.map((row) => [chhpRowKey(row), row]),
  );

  assert.equal(
    fromChhp.length,
    POWER_SOLAR_METER_MAPPINGS.length,
    "CHHP row count vs baked mappings",
  );

  for (const row of fromChhp) {
    const key = chhpRowKey(row);
    const baked = codeByKey.get(key);
    assert.ok(baked, `missing baked mapping for CHHP row ${key}`);
    assert.deepEqual(
      baked.feedInTariffColumns,
      row.feedInTariffColumns,
      `feed-in columns for ${row.chhpMeterId}`,
    );
    assert.equal(
      baked.rawColumnLetter,
      row.rawColumnLetter,
      `Mercury column for ${row.chhpMeterId}`,
    );
  }

  for (const row of POWER_SOLAR_METER_MAPPINGS) {
    assert.ok(chhpByKey.has(chhpRowKey(row)), `extra baked row ${row.chhpMeterId}`);
  }
});
