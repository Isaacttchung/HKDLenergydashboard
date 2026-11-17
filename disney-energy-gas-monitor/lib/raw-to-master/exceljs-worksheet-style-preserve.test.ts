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

test("mergeWorksheetPreservingCellStyles clones style from left column for new cells", () => {
  const pristine = `<?xml version="1.0"?><worksheet><dimension ref="A1:D2"/><sheetData>
    <row r="1"><c r="C1" s="27"><v>46336</v></c></row>
    <row r="2"><c r="C2" s="16"><v>12.34</v></c></row>
  </sheetData></worksheet>`;
  const written = `<?xml version="1.0"?><worksheet><dimension ref="A1:E2"/><sheetData>
    <row r="1"><c r="C1" s="27"><v>46336</v></c><c r="D1" s="10"><v>46337</v></c></row>
    <row r="2"><c r="C2" s="16"><v>12.34</v></c><c r="D2" s="13"><v>12.3456</v></c></row>
  </sheetData></worksheet>`;
  const out = mergeWorksheetPreservingCellStyles(pristine, written);
  assert.match(out, /r="D1" s="27"/);
  assert.match(out, /r="D2" s="16"/);
  assert.match(out, /<v>46337<\/v>/);
  assert.match(out, /<v>12\.3456<\/v>/);
});