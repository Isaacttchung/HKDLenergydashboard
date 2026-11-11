import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOutOfOrderUploadMessage,
  isSkipAheadOfLatestUpload,
  parseConfirmOutOfOrderUpload,
} from "./out-of-order-upload-guard";

describe("isSkipAheadOfLatestUpload", () => {
  it("allows the next calendar day", () => {
    assert.equal(isSkipAheadOfLatestUpload("2026-10-14", "2026-10-15"), false);
  });

  it("flags a forward gap", () => {
    assert.equal(isSkipAheadOfLatestUpload("2026-10-14", "2026-11-01"), true);
  });

  it("ignores backfill and duplicate-relative dates", () => {
    assert.equal(isSkipAheadOfLatestUpload("2026-11-01", "2026-10-20"), false);
    assert.equal(isSkipAheadOfLatestUpload("2026-10-14", "2026-10-14"), false);
  });

  it("allows first upload when no latest date", () => {
    assert.equal(isSkipAheadOfLatestUpload(null, "2026-11-01"), false);
  });
});

describe("buildOutOfOrderUploadMessage", () => {
  it("includes both dates and ordering note", () => {
    const msg = buildOutOfOrderUploadMessage("2026-10-14", "2026-11-01");
    assert.match(msg, /Latest upload date is 2026-10-14/);
    assert.match(msg, /you're uploading 2026-11-01/);
    assert.match(msg, /out of order/i);
    assert.match(msg, /Continue\?/);
  });
});

describe("parseConfirmOutOfOrderUpload", () => {
  it("reads confirm flag from form", () => {
    const form = new FormData();
    assert.equal(parseConfirmOutOfOrderUpload(form), false);
    form.set("confirmOutOfOrder", "true");
    assert.equal(parseConfirmOutOfOrderUpload(form), true);
    form.set("confirmOutOfOrder", "TRUE");
    assert.equal(parseConfirmOutOfOrderUpload(form), true);
  });
});
