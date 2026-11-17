import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeWorksheetPreservingCellStyles } from "@/lib/raw-to-master/exceljs-worksheet-style-preserve";

test("mergeWorksheetPreservingCellStyles keeps pristine s= on updated values", () => {
  const pristine = `<?xml version="1.0"?><worksheet><sheetViews/><sheetData><row r="2"><c r="E2" s="28"><v>1</v></c></row></sheetData></worksheet>`;
  const written = `<?xml version="1.0"?><worksheet><sheetData><row r="2"><c r="E2" s="99"><v>75.07</v></c></row></sheetData></worksheet>`;
  const out = mergeWorksheetPreservingCellStyles(pristine, written);
  assert.match(out, /r="E2" s="28"/);
  assert.match(out, /<v>75\.07<\/v>/);
  assert.doesNotMatch(out, /s="99"/);
});