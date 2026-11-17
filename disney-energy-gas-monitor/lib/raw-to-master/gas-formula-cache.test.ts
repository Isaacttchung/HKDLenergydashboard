import assert from "node:assert/strict";
import { test } from "node:test";
import {
  gasThirtyDaysFormulaResult,
  hkdlTodayIso,
} from "@/lib/raw-to-master/gas-formula-cache";
import { addIsoDays } from "@/lib/hkdl-daily-report-date";

test("gasThirtyDaysFormulaResult matches AND(A>=today-30,A<today)", () => {
  const today = hkdlTodayIso();
  assert.equal(gasThirtyDaysFormulaResult(today), false);
  assert.equal(gasThirtyDaysFormulaResult(addIsoDays(today, -1)), true);
  assert.equal(gasThirtyDaysFormulaResult(addIsoDays(today, -29)), true);
  assert.equal(gasThirtyDaysFormulaResult(addIsoDays(today, -31)), false);
  assert.equal(gasThirtyDaysFormulaResult(addIsoDays(today, 1)), false);
});