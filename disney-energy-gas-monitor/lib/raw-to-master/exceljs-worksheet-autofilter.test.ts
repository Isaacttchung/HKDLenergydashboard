import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ensureWorksheetAutoFilter,
  patchWorksheetAutoFilter,
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

test("ensureWorksheetAutoFilter adds filter when missing", () => {
  const xml = `<?xml version="1.0"?><worksheet><sheetData></sheetData></worksheet>`;
  const out = ensureWorksheetAutoFilter(xml, "A1:CCO301");
  assert.match(out, /autoFilter ref="A1:CCO301"/);
});