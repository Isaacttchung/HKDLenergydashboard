import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mergeWorksheetPreservingCellStyles,
  patchPowerSolarParkSheetView,
} from "@/lib/raw-to-master/exceljs-worksheet-style-preserve";

test("mergeWorksheetPreservingCellStyles keeps pristine s= on updated values", () => {
  const pristine = `<?xml version="1.0"?><worksheet><sheetViews/><sheetData><row r="2"><c r="E2" s="28"><v>1</v></c></row></sheetData></worksheet>`;
  const written = `<?xml version="1.0"?><worksheet><sheetData><row r="2"><c r="E2" s="99"><v>75.07</v></c></row></sheetData></worksheet>`;
  const out = mergeWorksheetPreservingCellStyles(pristine, written);
  assert.match(out, /r="E2" s="28"/);
  assert.match(out, /<v>75\.07<\/v>/);
  assert.doesNotMatch(out, /s="99"/);
});

test("mergeWorksheetPreservingCellStyles uses previous row style for new rows", () => {
  const pristine = `<?xml version="1.0"?><worksheet><dimension ref="A1:B2"/><sheetData>
    <row r="1"><c r="A1" s="10"><v>1</v></c><c r="B1" s="20"><v>2</v></c></row>
  </sheetData></worksheet>`;
  const written = `<?xml version="1.0"?><worksheet><dimension ref="A1:B2"/><sheetData>
    <row r="1"><c r="A1" s="10"><v>1</v></c><c r="B1" s="20"><v>2</v></c></row>
    <row r="2"><c r="A2" s="99"><v>3</v></c><c r="B2" s="88"><v>4</v></c></row>
  </sheetData></worksheet>`;
  const out = mergeWorksheetPreservingCellStyles(pristine, written);
  assert.match(out, /r="B2" s="20"/);
  assert.doesNotMatch(out, /r="B2" s="88"/);
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

test("mergeWorksheetPreservingCellStyles orders columns before AA", () => {
  const pristine = `<?xml version="1.0"?><worksheet><sheetData><row r="2"><c r="B2" s="1"><v>1</v></c></row></sheetData></worksheet>`;
  const written = `<?xml version="1.0"?><worksheet><sheetData><row r="2"><c r="AB2" s="2"><v>0</v></c><c r="B2" s="1"><v>1</v></c></row></sheetData></worksheet>`;
  const out = mergeWorksheetPreservingCellStyles(pristine, written);
  const idxB = out.indexOf('r="B2"');
  const idxAb = out.indexOf('r="AB2"');
  assert.ok(idxB >= 0 && idxAb >= 0 && idxB < idxAb);
});

test("patchPowerSolarParkSheetView resets frozen pane anchor", () => {
  const xml = `<?xml version="1.0"?><worksheet><sheetViews><sheetView><pane topLeftCell="W3046"/><selection pane="topRight" activeCell="U58" sqref="U58"/></sheetView></sheetViews></worksheet>`;
  const out = patchPowerSolarParkSheetView(xml);
  assert.match(out, /topLeftCell="B2"/);
  assert.match(out, /activeCell="A2"/);
  assert.doesNotMatch(out, /pane="topRight"/);
});