import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dropWorksheetCellsFromColumn,
  ensureTrailingDateColumnWidth,
  mergeWorksheetPreservingCellStyles,
  patchPowerSolarParkColumnChrome,
  patchPowerSolarParkSheetView,
  patchWebSsDataSheetView,
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

test("mergeWorksheetPreservingCellStyles preserves shared formula ca", () => {
  const pristine = `<?xml version="1.0"?><worksheet><sheetData><row r="2"><c r="AB2" s="324" t="b"><f t="shared" ca="1" si="0"/><v>0</v></c></row></sheetData></worksheet>`;
  const written = `<?xml version="1.0"?><worksheet><sheetData><row r="2"><c r="AB2" s="99" t="b"><f t="shared" si="0"/><v>0</v></c></row></sheetData></worksheet>`;
  const out = mergeWorksheetPreservingCellStyles(pristine, written);
  assert.match(out, /f ca="1"/);
});

test("dropWorksheetCellsFromColumn removes AC and beyond", () => {
  const xml = `<?xml version="1.0"?><worksheet><sheetData><row r="2"><c r="AB2"><v>1</v></c><c r="AC2"><v>9</v></c></row></sheetData></worksheet>`;
  const out = dropWorksheetCellsFromColumn(xml, "AC");
  assert.match(out, /AB2/);
  assert.doesNotMatch(out, /AC2/);
});

test("patchWebSsDataSheetView resets frozen pane to meter columns", () => {
  const xml = `<?xml version="1.0"?><worksheet><sheetViews><sheetView><pane topLeftCell="CCG2"/><selection pane="topRight" activeCell="C1" sqref="C1"/></sheetView></sheetViews></worksheet>`;
  const out = patchWebSsDataSheetView(xml);
  assert.match(out, /topLeftCell="C3"/);
  assert.match(out, /activeCell="A2"/);
  assert.doesNotMatch(out, /pane="topRight"/);
});

test("mergeWorksheetPreservingCellStyles ignores ExcelJS border styles on gas meter cols", () => {
  const pristine = `<?xml version="1.0"?><worksheet><sheetData>
    <row r="1"><c r="J1" s="22"><v>100</v></c></row>
  </sheetData></worksheet>`;
  const written = `<?xml version="1.0"?><worksheet><sheetData>
    <row r="1"><c r="J1" s="22"><v>100</v></c></row>
    <row r="2"><c r="I2" s="47"/><c r="J2" s="90"><v>0</v></c></row>
  </sheetData></worksheet>`;
  const out = mergeWorksheetPreservingCellStyles(pristine, written, {
    forceTemplateStyleColumns: new Set(["I", "J", "K", "L"]),
  });
  assert.match(out, /r="J2" s="22"/);
  assert.doesNotMatch(out, /s="90"/);
});

test("ensureTrailingDateColumnWidth adds width for a new date column", () => {
  const xml = `<?xml version="1.0"?><worksheet>
    <dimension ref="A1:CCO2"/>
    <cols><col min="2120" max="2120" width="11.85546875" customWidth="1"/></cols>
    <sheetData></sheetData></worksheet>`;
  const out = ensureTrailingDateColumnWidth(xml);
  assert.match(out, /min="2121" max="2121" width="11\.85546875"/);
});

test("patchPowerSolarParkColumnChrome trims styled cols beyond AB", () => {
  const xml = `<?xml version="1.0"?><worksheet><cols>
    <col min="27" max="27" width="11" style="2"/>
    <col min="29" max="29" width="12" style="2"/>
    <col min="37" max="16384" width="9" style="2"/>
  </cols></worksheet>`;
  const out = patchPowerSolarParkColumnChrome(xml);
  assert.match(out, /min="27"/);
  assert.doesNotMatch(out, /style="2"/);
  assert.doesNotMatch(out, /min="37"/);
});

test("patchPowerSolarParkSheetView resets frozen pane anchor", () => {
  const xml = `<?xml version="1.0"?><worksheet><sheetViews><sheetView><pane topLeftCell="W3046"/><selection pane="topRight" activeCell="U58" sqref="U58"/></sheetView></sheetViews></worksheet>`;
  const out = patchPowerSolarParkSheetView(xml);
  assert.match(out, /topLeftCell="B2"/);
  assert.match(out, /activeCell="A2"/);
  assert.doesNotMatch(out, /pane="topRight"/);
});