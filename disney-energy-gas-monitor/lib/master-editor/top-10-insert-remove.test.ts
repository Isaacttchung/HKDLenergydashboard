import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planTop10Insert } from "@/lib/master-editor/top-10-insert";
import { planTop10Remove } from "@/lib/master-editor/top-10-remove";
import type { Top10RawDataRow } from "@/lib/raw-to-master/load-top-10-rawdata-rows";
import {
  buildWebSsRowIndex,
  normalizeTop10Location,
  webSsRowKey,
} from "@/lib/raw-to-master/top-10-webss";
import * as XLSX from "xlsx";

function miniSheet(
  rows: Array<{ meter: string; location: string }>,
): Map<string, number> {
  const sheet: XLSX.WorkSheet = {};
  rows.forEach((r, i) => {
    const row = i + 1;
    sheet[XLSX.utils.encode_cell({ r: row, c: 0 })] = { t: "s", v: r.meter };
    sheet[XLSX.utils.encode_cell({ r: row, c: 1 })] = { t: "s", v: r.location };
  });
  sheet["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: rows.length, c: 1 },
  });
  return buildWebSsRowIndex(sheet);
}

const baseMapping: Top10RawDataRow[] = [
  {
    rawDataRow: 2,
    meter: "MRSS200_A1",
    location: "803",
    kind: "plain",
    importRef: { link: 6, col: "C" },
    recRef: null,
    feedInTariffColumns: [],
  },
];

describe("planTop10Insert", () => {
  it("plans row under anchor", () => {
    const index = miniSheet([
      { meter: "MRSS200_A1", location: "803" },
      { meter: "MRSS200_A2", location: "Spare" },
    ]);
    const preview = planTop10Insert(
      {
        anchorMeter: "MRSS200_A1",
        anchorLocation: "803",
        meter: "MRSS200_A1X",
        location: "New Loc",
        kind: "plain",
        importLink: 6,
        importCol: "D",
      },
      baseMapping,
      index,
    );
    assert.equal(preview.anchorSheetRow, 1);
    assert.equal(preview.newSheetRow, 2);
    assert.equal(preview.rawDataRow, 3);
  });
});

describe("planTop10Remove", () => {
  it("blocks protected outdoor row", () => {
    const mapping: Top10RawDataRow[] = [
      {
        rawDataRow: 301,
        meter: "Outdoor Air Temperature",
        location: "degC",
        kind: "skip",
        importRef: null,
        recRef: null,
        feedInTariffColumns: [],
      },
    ];
    const index = miniSheet([
      { meter: "Outdoor Air Temperature", location: "degC" },
    ]);
    assert.throws(() =>
      planTop10Remove(
        { meter: "Outdoor Air Temperature", location: "degC" },
        mapping,
        index,
      ),
    );
  });

  it("plans removable meter", () => {
    const index = miniSheet([{ meter: "MRSS200_A1", location: "803" }]);
    const preview = planTop10Remove(
      { meter: "MRSS200_A1", location: "803" },
      baseMapping,
      index,
    );
    assert.equal(preview.mappingRemoved, true);
    assert.equal(
      preview.removedKey,
      webSsRowKey("MRSS200_A1", normalizeTop10Location("803")),
    );
  });
});
