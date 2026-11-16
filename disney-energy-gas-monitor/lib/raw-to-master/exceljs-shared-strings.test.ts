import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mapWrittenSharedStringIndices,
  parseSharedStringsXml,
  remapSharedStringsInWorksheetXml,
} from "@/lib/raw-to-master/exceljs-shared-strings";

test("remapSharedStringsInWorksheetXml maps written indices to extended pristine", () => {
  const pristine = ["Date", "Meter"];
  const written = ["Other", "Date"];
  const map = mapWrittenSharedStringIndices([...pristine], written);
  assert.deepEqual(map, [2, 0]);
  const ws = `<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>1</v></c></row></sheetData></worksheet>`;
  const out = remapSharedStringsInWorksheetXml(ws, map);
  assert.match(out, /<v>0<\/v>/);
  assert.equal([...pristine], ["Date", "Meter", "Other"]);
});