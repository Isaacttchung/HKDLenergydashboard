import assert from "node:assert/strict";
import { test } from "node:test";
import {
  excelSerialMatchesIsoDate,
  isoDateToExcelSerial,
} from "@/lib/raw-to-master/excel-date";

test("excelSerialMatchesIsoDate accepts JS Date from ExcelJS", () => {
  const serial = isoDateToExcelSerial("2026-11-11");
  const asDate = new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000);
  assert.equal(excelSerialMatchesIsoDate(asDate, "2026-11-11"), true);
  assert.equal(excelSerialMatchesIsoDate(serial, "2026-11-11"), true);
});