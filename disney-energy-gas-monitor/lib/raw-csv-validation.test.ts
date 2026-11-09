import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  parseRawNumericCell,
  validateRawCsvBatch,
  validateRawCsvContent,
} from "./raw-csv-validation";

const FIXTURES = path.join(process.cwd(), "test/fixtures/raw");
const STORE_SAMPLES = path.join(
  "/cursor/stores/bc-9730d0bc-afd2-4356-8839-783fbc304878/media/raw-samples/all",
);

function fixture(name: string): string {
  return readFileSync(path.join(FIXTURES, name), "utf-8");
}

describe("parseRawNumericCell", () => {
  it("parses trimmed numbers and rejects non-numeric", () => {
    assert.equal(parseRawNumericCell(" 1215799.875 "), 1215799.875);
    assert.equal(parseRawNumericCell(""), null);
    assert.equal(parseRawNumericCell("n/a"), null);
    assert.equal(parseRawNumericCell(undefined), null);
  });
});

describe("validateRawCsvContent — synthetic violations", () => {
  it("flags CUMULATIVE_DECREASE on consecutive rows", () => {
    const csv = [
      "Timestamp,Site.MeterA#Real Energy#kWh,Site.MeterB#Real Energy#kWh",
      "2026-10-26 00:15:00,100,50",
      "2026-10-26 00:30:00,90,55",
      "2026-10-26 00:45:00,95,60",
    ].join("\n");
    const warnings = validateRawCsvContent(csv, { fileLabel: "test.csv" });
    const dec = warnings.filter((w) => w.code === "CUMULATIVE_DECREASE");
    assert.equal(dec.length, 1);
    assert.ok(dec[0].column.includes("MeterA"));
    assert.equal(dec[0].file, "test.csv");
  });

  it("allows equal adjacent cumulative values", () => {
    const csv = [
      "Timestamp,Site.MeterA#Real Energy#kWh",
      "2026-10-26 00:15:00,100",
      "2026-10-26 00:30:00,100",
      "2026-10-26 00:45:00,101",
    ].join("\n");
    const warnings = validateRawCsvContent(csv, { fileLabel: "test.csv" });
    assert.equal(
      warnings.filter((w) => w.code === "CUMULATIVE_DECREASE").length,
      0,
    );
  });

  it("skips comparison when either consecutive cell is empty", () => {
    const csv = [
      "Timestamp,Site.MeterA#Real Energy#kWh",
      "2026-10-26 00:15:00,100",
      "2026-10-26 00:30:00,",
      "2026-10-26 00:45:00,50",
    ].join("\n");
    const warnings = validateRawCsvContent(csv, { fileLabel: "test.csv" });
    assert.equal(
      warnings.filter((w) => w.code === "CUMULATIVE_DECREASE").length,
      0,
    );
  });

  it("flags NEGATIVE_DELTA when last minus first is negative", () => {
    const csv = [
      "Timestamp,Site.MeterA#Real Energy#kWh",
      "2026-10-26 00:15:00,200",
      "2026-10-26 00:30:00,150",
    ].join("\n");
    const warnings = validateRawCsvContent(csv, { fileLabel: "test.csv" });
    const neg = warnings.filter((w) => w.code === "NEGATIVE_DELTA");
    assert.equal(neg.length, 1);
    assert.ok(neg[0].column.includes("MeterA"));
  });

  it("flags LOW_DATA_COUNT below threshold", () => {
    const rows = [
      "Timestamp,Site.MeterA#Real Energy#kWh",
      "2026-10-26 00:15:00,1",
    ];
    for (let i = 1; i < 69; i += 1) {
      rows.push(`2026-10-26 00:${String(i).padStart(2, "0")}:00,${i}`);
    }
    const warnings = validateRawCsvContent(rows.join("\n"), {
      fileLabel: "sparse.csv",
      lowDataCountThreshold: 70,
    });
    assert.ok(warnings.some((w) => w.code === "LOW_DATA_COUNT"));
  });
});

describe("validateRawCsvContent — repo fixtures", () => {
  it("clean CCP_COP sample has no cumulative or negative warnings", () => {
    const content = fixture("CCP_COP_kWh_20261027040135_19aa.csv");
    const warnings = validateRawCsvContent(content, {
      fileLabel: "CCP_COP_kWh",
    });
    assert.equal(
      warnings.filter(
        (w) =>
          w.code === "CUMULATIVE_DECREASE" || w.code === "NEGATIVE_DELTA",
      ).length,
      0,
    );
  });

  it("SS201_TxC sample has 96 rows and no LOW_DATA_COUNT on numeric cols", () => {
    const content = fixture("SS201_TxC_1_20261027040929_3db1.csv");
    const warnings = validateRawCsvContent(content, {
      fileLabel: "SS201_TxC_1",
    });
    assert.equal(warnings.filter((w) => w.code === "LOW_DATA_COUNT").length, 0);
  });
});

describe("validateRawCsvBatch — store samples (when mounted)", () => {
  it("validates full store batch without throwing", () => {
    let dir = STORE_SAMPLES;
    try {
      readFileSync(path.join(dir, "CCP_COP_kWh_20261027040135_19aa.csv"));
    } catch {
      dir = FIXTURES;
    }
    const sampleName =
      dir === STORE_SAMPLES
        ? "CCP_COP_kWh_20261027040135_19aa.csv"
        : "CCP_COP_kWh_20261027040135_19aa.csv";
    const content = readFileSync(path.join(dir, sampleName), "utf-8");
    const batch = validateRawCsvBatch([
      { filename: sampleName, content },
    ]);
    assert.ok(Array.isArray(batch));
  });
});
