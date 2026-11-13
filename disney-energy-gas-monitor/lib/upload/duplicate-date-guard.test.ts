import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EnergyRecord } from "@/lib/types";
import { hasDailyReportData } from "@/lib/reporting-date";
import { parseReplaceExisting } from "./duplicate-date-guard";

/** Mirrors duplicate guard: only block when park kWh exists for the day (same as latest-date rule). */
function wouldDuplicate(records: EnergyRecord[], incomingDate: string): boolean {
  return hasDailyReportData(records, incomingDate);
}

describe("duplicate date vs dashboard latest", () => {
  it("does not treat Top 10-only dates as duplicates", () => {
    const records: EnergyRecord[] = [
      {
        date: "2026-11-10",
        sourceId: "park",
        energyType: "electricity",
        valueKwh: 100,
        costHkd: null,
      },
    ];
    assert.equal(wouldDuplicate(records, "2026-11-11"), false);
    assert.equal(wouldDuplicate(records, "2026-11-10"), true);
  });
});

describe("parseReplaceExisting", () => {
  it("reads form flag", () => {
    const form = new FormData();
    assert.equal(parseReplaceExisting(form), false);
    form.set("replaceExisting", "true");
    assert.equal(parseReplaceExisting(form), true);
    form.set("replaceExisting", "TRUE");
    assert.equal(parseReplaceExisting(form), true);
  });
});
