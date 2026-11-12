import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveExpectedMasterSheetFilename } from "./master-sheets-config";

describe("resolveExpectedMasterSheetFilename", () => {
  it("maps feed-in report with export suffix", () => {
    assert.equal(
      resolveExpectedMasterSheetFilename(
        "HKDL_Daily_Feed-in_Tariff_Report_acc8.xlsx",
      ),
      "HKDL_Daily_Feed-in_Tariff_Report.xlsx",
    );
    assert.equal(
      resolveExpectedMasterSheetFilename(
        "HKDL Daily Feed-in Tariff Report.xlsx",
      ),
      "HKDL_Daily_Feed-in_Tariff_Report.xlsx",
    );
  });
});
