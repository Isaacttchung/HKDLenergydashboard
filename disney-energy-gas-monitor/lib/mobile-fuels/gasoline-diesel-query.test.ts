import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getMobileFuelsSummary,
  isCalendarMonthAlignedRange,
} from "./gasoline-diesel-query";

describe("isCalendarMonthAlignedRange", () => {
  it("accepts multi-month ranges on month boundaries", () => {
    assert.equal(
      isCalendarMonthAlignedRange("2022-01-01", "2022-06-30"),
      true,
    );
    assert.equal(
      isCalendarMonthAlignedRange("2022-03-01", "2022-03-31"),
      true,
    );
  });

  it("rejects partial months", () => {
    assert.equal(
      isCalendarMonthAlignedRange("2022-01-15", "2022-06-30"),
      false,
    );
    assert.equal(
      isCalendarMonthAlignedRange("2022-01-01", "2022-06-15"),
      false,
    );
  });
});

describe("getMobileFuelsSummary", () => {
  it("returns N/A for non-aligned custom preset", async () => {
    const summary = await getMobileFuelsSummary(
      "custom",
      "2022-01-15",
      "2022-06-30",
    );
    assert.ok(summary);
    assert.equal(summary!.dieselLiters, null);
    assert.equal(summary!.gasolineLiters, null);
    assert.deepEqual(summary!.dieselBreakdown, []);
  });

  it("sums aligned custom months when store has data", async () => {
    const summary = await getMobileFuelsSummary(
      "custom",
      "2022-01-01",
      "2022-01-31",
    );
    assert.ok(summary);
    assert.notEqual(summary!.dieselLiters, null);
    assert.notEqual(summary!.gasolineLiters, null);
  });

  it("returns N/A for custom range before recorded data", async () => {
    const summary = await getMobileFuelsSummary(
      "custom",
      "2018-08-01",
      "2018-11-30",
    );
    assert.ok(summary);
    assert.equal(summary!.dieselLiters, null);
    assert.equal(summary!.gasolineLiters, null);
  });

  it("returns N/A when range includes months not yet in the workbook (e.g. Aug–Oct 2026)", async () => {
    const summary = await getMobileFuelsSummary(
      "custom",
      "2026-08-01",
      "2026-10-31",
    );
    assert.ok(summary);
    assert.equal(summary!.dieselLiters, null);
    assert.equal(summary!.gasolineLiters, null);
  });

  it("returns N/A for day view in a month with no mobile fuel data", async () => {
    const summary = await getMobileFuelsSummary("day", "2018-08-15", "2018-08-15");
    assert.ok(summary);
    assert.equal(summary!.dieselLiters, null);
    assert.equal(summary!.isMonthlyGranularity, true);
  });
});
