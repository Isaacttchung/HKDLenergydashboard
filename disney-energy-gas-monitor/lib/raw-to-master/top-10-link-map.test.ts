import assert from "node:assert/strict";
import { test } from "node:test";
import {
  top10EditorLinkOptions,
  top10ImportSourceLogicalIds,
} from "@/lib/raw-to-master/top-10-link-map";

test("Top 10 import sources are 25 EMS CSVs (batch minus Daily1)", () => {
  assert.equal(top10ImportSourceLogicalIds().length, 25);
  assert.equal(
    top10ImportSourceLogicalIds().includes("CCP+HCCP_Daily1"),
    false,
  );
  assert.equal(top10EditorLinkOptions().length, 25);
});
