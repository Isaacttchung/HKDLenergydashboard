import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fullResortDataColumnLabel } from "./full-resort-data-label";

describe("fullResortDataColumnLabel", () => {
  it("formats labels for each time preset", () => {
    assert.equal(
      fullResortDataColumnLabel("day", "2026-10-14"),
      "Daily full resort kWh data (14/10/2026)",
    );
    assert.equal(
      fullResortDataColumnLabel("month", "2026-10-01"),
      "Monthly full resort kWh data (10/2026)",
    );
    assert.equal(
      fullResortDataColumnLabel("ytd", "2026-01-01"),
      "Yearly full resort kWh data (2026)",
    );
    assert.equal(
      fullResortDataColumnLabel("custom", "2026-10-01", "2026-10-14"),
      "Range full resort kWh data (01/10/2026 - 14/10/2026)",
    );
  });
});
