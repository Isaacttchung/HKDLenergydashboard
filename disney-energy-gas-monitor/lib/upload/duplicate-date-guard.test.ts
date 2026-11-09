import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseReplaceExisting } from "./duplicate-date-guard";

describe("parseReplaceExisting", () => {
  it("reads form flag", () => {
    const form = new FormData();
    assert.equal(parseReplaceExisting(form), false);
    form.set("replaceExisting", "true");
    assert.equal(parseReplaceExisting(form), true);
    form.set("replaceExisting", "TRUE");
    assert.equal(parseReplaceExisting(form), true);
  });
});
