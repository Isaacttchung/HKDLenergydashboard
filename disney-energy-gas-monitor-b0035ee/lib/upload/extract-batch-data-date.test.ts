import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  extractRawBatchDataDate,
  timestampCellToDataDate,
} from "./extract-batch-data-date";

const FIXTURE = path.join(
  process.cwd(),
  "test/fixtures/raw/CCP_COP_kWh_20261027040135_19aa.csv",
);

describe("timestampCellToDataDate", () => {
  it("parses ISO date prefix", () => {
    assert.equal(timestampCellToDataDate("2026-10-26 00:15:00"), "2026-10-26");
  });
});

describe("extractRawBatchDataDate", () => {
  it("reads data date from sample fixture", () => {
    const text = readFileSync(FIXTURE, "utf-8");
    assert.equal(extractRawBatchDataDate([text]), "2026-10-26");
  });
});
