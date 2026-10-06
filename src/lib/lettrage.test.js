import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lettrageSelection, tiersLinesFromEntries, tiersOptionLabels } from "./lettrage.js";

describe("lettrage helpers", () => {
  it("collects posted 4411 lines and ignores drafts", () => {
    const lines = tiersLinesFromEntries(
      [
        {
          id: "d",
          is_draft: true,
          lines: [{ id: "x", compte: "4411", debit: 0, credit: 10 }],
        },
        {
          id: "p",
          is_draft: false,
          reference_piece: "FF-1",
          lines: [
            { id: "a", date: "2026-01-01", compte: "44110001", libelle: "Sud", debit: 0, credit: 100, facture: "FF-1" },
            { id: "b", date: "2026-01-02", compte: "6111", debit: 100, credit: 0 },
          ],
        },
      ],
      "4411"
    );
    assert.equal(lines.length, 1);
    assert.equal(lines[0].id, "a");
    assert.equal(lines[0].piece, "FF-1");
  });

  it("flags an exact match and a remainder", () => {
    const exact = lettrageSelection([
      { debit: 100, credit: 0 },
      { debit: 0, credit: 100 },
    ]);
    assert.equal(exact.canExact, true);
    assert.equal(exact.canRemainder, false);

    const rest = lettrageSelection([
      { debit: 40, credit: 0 },
      { debit: 0, credit: 100 },
    ]);
    assert.equal(rest.canExact, false);
    assert.equal(rest.canRemainder, true);
    assert.equal(rest.remainder, 60);
  });

  it("builds tiers labels from auxiliary accounts", () => {
    const labels = tiersOptionLabels([
      { id: "1", code: "4411", name: "Fournisseurs", parent_id: null },
      { id: "2", code: "44110001", name: "Oasis", parent_id: "1" },
    ]);
    assert.deepEqual(labels, ["4411 - Oasis"]);
  });
});
