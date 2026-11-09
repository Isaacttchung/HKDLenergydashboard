import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveRawLogicalId } from "./raw-data-config";

describe("resolveRawLogicalId", () => {
  it("maps CCP+HCCP Daily1 with spaces or underscores", () => {
    assert.equal(
      resolveRawLogicalId("CCP+HCCP Daily1_20261027040135_19aa.csv"),
      "CCP+HCCP_Daily1",
    );
    assert.equal(
      resolveRawLogicalId("CCP+HCCP_Daily1_20261027040135_19aa.csv"),
      "CCP+HCCP_Daily1",
    );
  });
});
