import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatGasCapacityPreflightMessage,
  preflightHccpGasCapacityForConsumption,
} from "@/lib/upload/hccp-gas-capacity-preflight";

test("formatGasCapacityPreflightMessage lists missing dates", () => {
  assert.equal(
    formatGasCapacityPreflightMessage(["2026-11-08"]),
    "Gas needs Capacity data for 2026-11-08. Upload yesterday's export or a file that includes those midnights.",
  );
  assert.equal(
    formatGasCapacityPreflightMessage(["2026-11-08", "2026-11-09"]),
    "Gas needs Capacity data for 2026-11-08 and 2026-11-09. Upload yesterday's export or a file that includes those midnights.",
  );
  assert.equal(
    formatGasCapacityPreflightMessage([
      "2026-11-07",
      "2026-11-08",
      "2026-11-09",
    ]),
    "Gas needs Capacity data for 2026-11-07, 2026-11-08 and 2026-11-09. Upload yesterday's export or a file that includes those midnights.",
  );
});

const ONLY_D_SNIPPET = `"Time","B","C"
"11/08/2026 00:00:00","13,119.0","25,150.0"`;

const D_AND_D1_SNIPPET = `"Time","B","C"
"11/08/2026 00:00:00","13,119.0","25,150.0"
"11/09/2026 00:00:00","14,236.0","26,127.0"`;

test("preflight fails when D+1 midnight missing", async () => {
  const result = await preflightHccpGasCapacityForConsumption(
    "2026-11-08",
    ONLY_D_SNIPPET,
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.deepEqual(result.missingDates, ["2026-11-09"]);
  assert.match(result.message, /2026-11-09/);
});

test("preflight passes when D and D+1 present", async () => {
  const result = await preflightHccpGasCapacityForConsumption(
    "2026-11-08",
    D_AND_D1_SNIPPET,
  );
  assert.equal(result.ok, true);
});

test("preflight merges supplement CSV midnights", async () => {
  const supplement = `"Time","B","C"
"11/09/2026 00:00:00","14,236.0","26,127.0"`;
  const result = await preflightHccpGasCapacityForConsumption(
    "2026-11-08",
    ONLY_D_SNIPPET,
    [supplement],
  );
  assert.equal(result.ok, true);
});
