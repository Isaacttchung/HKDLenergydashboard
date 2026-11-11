import assert from "node:assert/strict";
import { test } from "node:test";
import type { Top10RawDataRow } from "@/lib/raw-to-master/load-top-10-rawdata-rows";
import rawDataRows from "@/lib/raw-to-master/top-10-rawdata-rows.json";
import {
  buildWebSsRowIndex,
  findMappingForWebSsRow,
  normalizeTop10Location,
  resolveWebSsRow,
  webSsRowKey,
} from "@/lib/raw-to-master/top-10-webss";
import * as XLSX from "xlsx";

function sheetWithRows(
  pairs: Array<{ meter: string; location: string }>,
): XLSX.WorkSheet {
  const sheet: XLSX.WorkSheet = {};
  pairs.forEach(({ meter, location }, i) => {
    const row = i + 1;
    sheet[XLSX.utils.encode_cell({ r: row, c: 0 })] = { t: "s", v: meter };
    sheet[XLSX.utils.encode_cell({ r: row, c: 1 })] = { t: "s", v: location };
  });
  sheet["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: pairs.length, c: 1 },
  });
  return sheet;
}

test("findMappingForWebSsRow resolves meter aliases and aggregate300", () => {
  const sheet = sheetWithRows([
    { meter: "MRSS208_HV", location: "HV" },
    { meter: "SS205", location: "Sum CCP1" },
    { meter: "MRSS206B_B5", location: "636 MCB2 - EV Charge" },
  ]);
  const index = buildWebSsRowIndex(sheet);
  const rows = rawDataRows as Top10RawDataRow[];

  const hv = findMappingForWebSsRow(index, 1, rows);
  assert.equal(hv?.meter, "MRSS208HV");

  const sum = findMappingForWebSsRow(index, 2, rows);
  assert.equal(sum?.kind, "aggregate300");

  const ev = findMappingForWebSsRow(index, 3, rows);
  assert.equal(ev?.meter, "MRSS206B_B5");
  assert.equal(normalizeTop10Location(ev?.location ?? ""), "636 MCB2 - EV Charge");
  assert.deepEqual(ev?.importRef, { link: 18, col: "M" });
});

test("buildWebSsRowIndex keys align with resolveWebSsRow for alias meters", () => {
  const sheet = sheetWithRows([{ meter: "SS205", location: "Sum CCP1" }]);
  const index = buildWebSsRowIndex(sheet);
  assert.equal(
    resolveWebSsRow(index, "SS205_Tx(All-EA8)", "Sum CCP1"),
    index.get(webSsRowKey("SS205", "Sum CCP1")),
  );
});
