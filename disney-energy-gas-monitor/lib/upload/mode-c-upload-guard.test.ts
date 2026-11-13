import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatYearMonthLabel } from "./mode-c-upload-types";
import {
  buildModeCSoftWarningMessage,
  evaluateMonthlyStoreWarnings,
  parseConfirmModeCSoftWarnings,
} from "./mode-c-upload-guard";

describe("parseConfirmModeCSoftWarnings", () => {
  it("parses confirm flag", () => {
    const form = new FormData();
    assert.equal(parseConfirmModeCSoftWarnings(form), false);
    form.set("confirmModeCSoftWarnings", "true");
    assert.equal(parseConfirmModeCSoftWarnings(form), true);
  });
});

describe("evaluateMonthlyStoreWarnings", () => {
  const meta = {
    workbookLabel: "Test workbook",
    filename: "test.xlsx",
  };

  it("flags unchanged when stores match", () => {
    const store = {
      "2026-08": { dieselByLocation: { shuttle: 1 }, gasolineByLocation: {} },
    };
    const result = evaluateMonthlyStoreWarnings(store, store, meta);
    assert.equal(result.unchangedLabel, meta.workbookLabel);
    assert.equal(result.outdated, undefined);
  });

  it("flags outdated when incoming latest month is older", () => {
    const existing = {
      "2026-09": { dieselByLocation: { shuttle: 1 }, gasolineByLocation: {} },
    };
    const incoming = {
      "2026-08": { dieselByLocation: { shuttle: 2 }, gasolineByLocation: {} },
    };
    const result = evaluateMonthlyStoreWarnings(incoming, existing, meta);
    assert.equal(result.unchangedLabel, undefined);
    assert.equal(result.outdated?.existingLatestMonth, "2026-09");
    assert.equal(result.outdated?.incomingLatestMonth, "2026-08");
  });

  it("allows first upload when existing is empty", () => {
    const incoming = {
      "2026-08": { dieselByLocation: { shuttle: 1 }, gasolineByLocation: {} },
    };
    const result = evaluateMonthlyStoreWarnings(incoming, {}, meta);
    assert.equal(result.unchangedLabel, undefined);
    assert.equal(result.outdated, undefined);
  });
});

describe("buildModeCSoftWarningMessage", () => {
  it("mentions unchanged and outdated", () => {
    const msg = buildModeCSoftWarningMessage({
      unchangedFileLabels: ["Mobile gasoline/diesel workbook"],
      outdated: [
        {
          workbookLabel: "Monthly utilities consumption (TGMJ)",
          filename: "file.xlsx",
          existingLatestMonth: "2026-09",
          incomingLatestMonth: "2026-08",
        },
      ],
    });
    assert.match(msg, /no data would change/i);
    assert.match(msg, /before the latest month/i);
  });
});

describe("formatYearMonthLabel", () => {
  it("formats yyyy-MM", () => {
    assert.equal(formatYearMonthLabel("2026-08"), "August 2026");
  });
});
