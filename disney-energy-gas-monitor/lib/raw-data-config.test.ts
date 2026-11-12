import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isHccpGasCapacityCsvFilename,
  resolveRawLogicalId,
} from "./raw-data-config";

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

  it("maps CCP_HCCP_Daily1 exports with short or full suffixes", () => {
    assert.equal(
      resolveRawLogicalId("CCP_HCCP_Daily1_c1c7.csv"),
      "CCP+HCCP_Daily1",
    );
    assert.equal(
      resolveRawLogicalId("CCP_HCCP_Daily1_20261112041434_adbf.csv"),
      "CCP+HCCP_Daily1",
    );
  });

  it("maps HCCP Gas Capacity exports with short suffix", () => {
    assert.equal(isHccpGasCapacityCsvFilename("HCCP_Gas_Capacity_dd5f.csv"), true);
    assert.equal(isHccpGasCapacityCsvFilename("HCCP Gas Capacity.csv"), true);
  });
});
