import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computePowerSolarAreaTotal,
  isExcludedFromAreaTotal,
} from "@/lib/raw-to-master/power-solar";

test("area total exclusions match golden rules", () => {
  assert.equal(isExcludedFromAreaTotal("CCP", "EA8"), true);
  assert.equal(isExcludedFromAreaTotal("CCP", "SS205A_TxA (kWh)"), false);
  assert.equal(
    isExcludedFromAreaTotal("HCCP", "SS303B_TxD3_C12 CSB"),
    true,
  );

  const values = new Map<string, number>([
    ["CCP::SS205A_TxA (kWh)", 100],
    ["CCP::EA8", 50],
  ]);
  assert.equal(computePowerSolarAreaTotal("CCP", values), 100 - 50);
});
