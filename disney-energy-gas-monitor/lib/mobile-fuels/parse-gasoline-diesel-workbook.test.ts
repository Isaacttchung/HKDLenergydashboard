import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { describe, it } from "node:test";
import {
  locationKeyFromLabel,
  normalizeFuelLocationLabel,
  parseGasolineDieselWorkbook,
} from "./parse-gasoline-diesel-workbook";

const SAMPLE_XLSX =
  "/home/ubuntu/.cursor/projects/workspace/uploads/FY20-26_Mobile_Gasoline_Diesel_data_sent_38f2.xlsx";

describe("mobile fuel label helpers", () => {
  it("strips parenthetical owner names", () => {
    assert.equal(
      normalizeFuelLocationLabel("Shuttle (Alice Wong)"),
      "Shuttle",
    );
    assert.equal(locationKeyFromLabel("Train station (Bob)"), "train_station");
  });
});

describe("parseGasolineDieselWorkbook", () => {
  it("parses sample workbook with FY Q1 offset months", () => {
    if (!existsSync(SAMPLE_XLSX)) {
      return;
    }
    const buffer = readFileSync(SAMPLE_XLSX);
    const store = parseGasolineDieselWorkbook(buffer);
    const months = Object.keys(store).sort();
    assert.ok(months.length > 0);
    assert.equal(months[0], "2019-10");
    assert.ok(months.includes("2020-01"));
    assert.ok(months[months.length - 1]!.startsWith("2026"));

    const oct2019 = store["2019-10"];
    assert.ok(oct2019);
    const dieselKeys = Object.keys(oct2019!.dieselByLocation);
    const gasKeys = Object.keys(oct2019!.gasolineByLocation);
    assert.ok(dieselKeys.length >= 1);
    assert.ok(gasKeys.length >= 1);
    assert.equal(
      Object.keys(oct2019!.dieselByLocation).some((k) => k.includes("lpg")),
      false,
    );
  });
});
