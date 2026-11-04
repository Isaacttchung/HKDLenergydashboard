import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { FeedInTariffLookup } from "@/lib/raw-to-master/feed-in-tariff-lookup";

const FEED_IN_SAMPLE =
  "/cursor/stores/self/media/HKDL_Daily_Feed-in_Tariff_Report_2026-10-26-test.xlsx";

test("requireDataDate throws when date row missing", async () => {
  const buffer = await readFile(FEED_IN_SAMPLE);
  const lookup = FeedInTariffLookup.fromBuffer(buffer);
  assert.throws(
    () => lookup.requireDataDate("1999-01-01"),
    /no row for data date/,
  );
});
