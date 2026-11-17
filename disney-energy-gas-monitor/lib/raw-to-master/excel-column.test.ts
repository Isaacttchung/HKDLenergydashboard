import assert from "node:assert/strict";
import { test } from "node:test";
import { previousExcelColumn } from "@/lib/raw-to-master/excel-column";

test("previousExcelColumn decrements column letters", () => {
  assert.equal(previousExcelColumn("B"), "A");
  assert.equal(previousExcelColumn("A"), null);
  assert.equal(previousExcelColumn("CCO"), "CCN");
  assert.equal(previousExcelColumn("AA"), "Z");
});