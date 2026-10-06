import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDate } from "./utils.js";

describe("formatDate", () => {
  it("formats a calendar date without UTC shifting the day", () => {
    assert.equal(formatDate("2026-01-12"), "12/01/2026");
    assert.equal(formatDate("2026-01-12T23:00:00.000Z"), "12/01/2026");
    assert.equal(formatDate(""), "");
    assert.equal(formatDate(undefined), "");
  });
});
