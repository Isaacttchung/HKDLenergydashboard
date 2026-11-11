import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planTop10Rename } from "@/lib/master-editor/top-10-rename";
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

describe("planTop10Rename", () => {
  const mapping: Top10RawDataRow[] = [
    {
      rawDataRow: 2,
      meter: "MRSS200_A1",
      location: "803 (805 / 807 / 808 / 809ABC)",
      kind: "plain",
      importRef: { link: 6, col: "C" },
      recRef: null,
      feedInTariffColumns: [],
    },
  ];

  it("accepts location-only rename", () => {
    const index = miniSheet([
      {
        meter: "MRSS200_A1",
        location: "803 (805 / 807 / 808 / 809ABC)",
      },
    ]);
    const preview = planTop10Rename(
      {
        currentMeter: "MRSS200_A1",
        currentLocation: "803 (805 / 807 / 808 / 809ABC)",
        newMeter: "MRSS200_A1",
        newLocation: "803",
      },
      mapping,
      index,
    );
    assert.equal(preview.mappingUpdates, 1);
    assert.equal(preview.newKey, webSsRowKey("MRSS200_A1", "803"));
  });

  it("rejects duplicate target", () => {
    const index = miniSheet([
      { meter: "MRSS200_A1", location: "803" },
      { meter: "MRSS200_A2", location: "Spare" },
    ]);
    const two: Top10RawDataRow[] = [
      ...mapping,
      {
        rawDataRow: 3,
        meter: "MRSS200_A2",
        location: "Spare",
        kind: "plain",
        importRef: { link: 6, col: "E" },
        recRef: null,
        feedInTariffColumns: [],
      },
    ];
    assert.throws(() =>
      planTop10Rename(
        {
          currentMeter: "MRSS200_A1",
          currentLocation: normalizeTop10Location(
            "803 (805 / 807 / 808 / 809ABC)",
          ),
          newMeter: "MRSS200_A2",
          newLocation: "Spare",
        },
        two,
        index,
      ),
    );
  });
});
