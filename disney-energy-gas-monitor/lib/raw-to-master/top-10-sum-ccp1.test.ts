import assert from "node:assert/strict";
import { test } from "node:test";
import { rowFeedsSumCcp1Aggregate } from "@/lib/raw-to-master/top-10-sum-ccp1";

test("rowFeedsSumCcp1Aggregate matches SS205 building blocks", () => {
  assert.equal(rowFeedsSumCcp1Aggregate(147), true);
  assert.equal(rowFeedsSumCcp1Aggregate(153), true);
  assert.equal(rowFeedsSumCcp1Aggregate(200), false);
  assert.equal(rowFeedsSumCcp1Aggregate(undefined), false);
});
