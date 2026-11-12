import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isMonthlyUtilitiesConsumptionFilename } from "./utilities-consumption-filename";
import { parseTgmjWorkbook } from "./parse-tgmj-workbook";
import { getMonthlyResortGasSummary } from "./tgmj-query";

const SAMPLE =
  "/home/ubuntu/.cursor/projects/workspace/uploads/52._Disney_Monthly_Utilities_Consumption-20260926_8ff5.xlsx";

describe("isMonthlyUtilitiesConsumptionFilename", () => {
  it("matches Disney monthly utilities workbook names", () => {
    assert.equal(
      isMonthlyUtilitiesConsumptionFilename(
        "52. Disney Monthly Utilities Consumption-20260926.xlsx",
      ),
      true,
    );
  });
});

describe("parseTgmjWorkbook", () => {
  it("parses TGMJ from sample file", () => {
    if (!existsSync(SAMPLE)) return;
    const { store, columnLayout } = parseTgmjWorkbook(readFileSync(SAMPLE));
    const months = Object.keys(store).sort();
    assert.equal(months[0], "2021-01");
    assert.equal(months.at(-1), "2026-09");
    assert.ok(columnLayout.filter((c) => c.kind === "back_of_house").length >= 10);
  });
});

describe("getMonthlyResortGasSummary with seeded store", () => {
  it("returns area and back-of-house MJ for a covered month", async () => {
    if (!existsSync(SAMPLE)) return;
    const { saveTgmjWorkbookUpload } = await import("./tgmj-store");
    await saveTgmjWorkbookUpload(readFileSync(SAMPLE));
    const summary = await getMonthlyResortGasSummary(
      "month",
      "2022-06-01",
      "2022-06-30",
    );
    assert.ok(summary?.available);
    assert.ok((summary?.areas.length ?? 0) > 0);
    assert.ok(summary?.hotelMj !== null);
    assert.ok((summary?.backOfHouseMj ?? 0) > 0);
    assert.ok(
      !summary!.areas.some((a) => /disneyland hotel|hollywood hotel/i.test(a.label)),
    );
  });
});
