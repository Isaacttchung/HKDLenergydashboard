import assert from "node:assert/strict";
import { test } from "node:test";
import {
  filterDatabaseDimensionGrowRowsOnlyPark,
  patchPowerSolarParkAutoFilterToDimension,
  patchWorksheetAutoFilter,
  patchWorksheetAutoFilterGrowRowsOnly,
  removeWorksheetAutoFilter,
} from "@/lib/raw-to-master/exceljs-worksheet-autofilter";

test("patchWorksheetAutoFilter grows autoFilter to sheet dimension", () => {
  const xml = `<?xml version="1.0"?><worksheet><dimension ref="A1:K3057"/><autoFilter ref="A1:J2367"/></worksheet>`;
  const out = patchWorksheetAutoFilter(xml, "A1:K3057");
  assert.match(out, /autoFilter ref="A1:K3057"/);
});

test("patchWorksheetAutoFilter keeps original header row when growing", () => {
  const xml = `<?xml version="1.0"?><worksheet><dimension ref="A1:S3058"/><autoFilter ref="A2:S2145"/></worksheet>`;
  const out = patchWorksheetAutoFilter(xml, "A1:S3058");
  assert.match(out, /autoFilter ref="A2:S3058"/);
});

test("patchWorksheetAutoFilterGrowRowsOnly keeps pristine filter columns", () => {
  const pristine = `<?xml version="1.0"?><worksheet><autoFilter ref="A1:AC2592"/></worksheet>`;
  const merged = `<?xml version="1.0"?><worksheet><dimension ref="A1:AJ3057"/><autoFilter ref="A1:AJ3057"/></worksheet>`;
  const out = patchWorksheetAutoFilterGrowRowsOnly(
    pristine,
    merged,
    "A1:AJ3057",
  );
  assert.match(out, /autoFilter ref="A1:AC3057"/);
  assert.match(out, /AC3057/);
});

test("patchPowerSolarParkAutoFilterToDimension clamps filter to AB", () => {
  const xml = `<?xml version="1.0"?><worksheet>
    <dimension ref="A1:AB3057"/>
    <autoFilter ref="A1:AC3057"/>
  </worksheet>`;
  const out = patchPowerSolarParkAutoFilterToDimension(xml, "A1:AB3057");
  assert.match(out, /autoFilter ref="A1:AB3057"/);
  assert.doesNotMatch(out, /AC3057/);
});

test("filterDatabaseDimensionGrowRowsOnlyPark uses dimension end column", () => {
  const pristine = `<?xml version="1.0"?><worksheet><autoFilter ref="A1:AC2592"/></worksheet>`;
  const out = filterDatabaseDimensionGrowRowsOnlyPark(
    pristine,
    "A1:AB3057",
  );
  assert.match(out, /A1:AB3057/);
  assert.doesNotMatch(out, /AC/);
});

test("removeWorksheetAutoFilter strips worksheet filter tag", () => {
  const xml = `<?xml version="1.0"?><worksheet><autoFilter ref="A1:CCO301"/><sheetData></sheetData></worksheet>`;
  const out = removeWorksheetAutoFilter(xml);
  assert.doesNotMatch(out, /autoFilter/);
});