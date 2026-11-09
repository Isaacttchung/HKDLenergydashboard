import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyUploadBatch,
  RAW_CONVERSION_FEED_IN_MASTER,
} from "./batch-classifier";
import { EXPECTED_RAW_LOGICAL_IDS } from "@/lib/raw-data-config";
import { EXPECTED_MASTER_SHEET_FILES } from "@/lib/master-sheets-config";

const RAW_SAMPLE_NAMES = EXPECTED_RAW_LOGICAL_IDS.map(
  (id) => `${id}_20261027040135_19aa.csv`,
);

describe("classifyUploadBatch", () => {
  it("accepts all four masters", () => {
    const result = classifyUploadBatch([...EXPECTED_MASTER_SHEET_FILES]);
    assert.equal(result.kind, "master_replace");
  });

  it("rejects partial master batch", () => {
    const result = classifyUploadBatch([EXPECTED_MASTER_SHEET_FILES[0]]);
    assert.equal(result.kind, "invalid");
    if (result.kind === "invalid") {
      assert.match(result.error, /four/i);
      assert.ok(result.missing?.length);
    }
  });

  it("accepts 26 raws + HCCP Gas Capacity + feed-in", () => {
    const result = classifyUploadBatch([
      ...RAW_SAMPLE_NAMES,
      "HCCP Gas Capacity.csv",
      RAW_CONVERSION_FEED_IN_MASTER,
    ]);
    assert.equal(result.kind, "raw_conversion");
  });

  it("rejects 26 raws + feed-in without HCCP Gas Capacity", () => {
    const result = classifyUploadBatch([
      ...RAW_SAMPLE_NAMES,
      RAW_CONVERSION_FEED_IN_MASTER,
    ]);
    assert.equal(result.kind, "invalid");
    if (result.kind === "invalid") {
      assert.match(result.error, /HCCP Gas Capacity/i);
    }
  });

  it("rejects 26 raws without feed-in", () => {
    const result = classifyUploadBatch(RAW_SAMPLE_NAMES);
    assert.equal(result.kind, "invalid");
    if (result.kind === "invalid") {
      assert.match(result.error, /feed-in/i);
    }
  });

  it("rejects feed-in without 26 raws", () => {
    const result = classifyUploadBatch([RAW_CONVERSION_FEED_IN_MASTER]);
    assert.equal(result.kind, "invalid");
    if (result.kind === "invalid") {
      assert.match(result.error, /HCCP Gas Capacity|26 EMS/i);
    }
  });

  it("rejects raw mixed with non-feed-in master", () => {
    const result = classifyUploadBatch([
      RAW_SAMPLE_NAMES[0],
      "HKDL_Top_10.xlsx",
    ]);
    assert.equal(result.kind, "invalid");
    if (result.kind === "invalid") {
      assert.match(result.error, /Mixed batch/i);
    }
  });

  it("rejects incomplete raw set with feed-in", () => {
    const result = classifyUploadBatch([
      RAW_SAMPLE_NAMES[0],
      RAW_CONVERSION_FEED_IN_MASTER,
    ]);
    assert.equal(result.kind, "invalid");
    if (result.kind === "invalid") {
      assert.match(result.error, /Incomplete raw|HCCP Gas Capacity/i);
    }
  });
});
