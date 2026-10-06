import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dailyFinancialsFromJournal } from "./financials.js";

describe("dailyFinancialsFromJournal", () => {
  it("builds CA from class 7 and charges from class 6, ignoring drafts", () => {
    const days = dailyFinancialsFromJournal([
      {
        is_draft: true,
        lines: [{ date: "2026-03-01", compte: "7111", debit: 0, credit: 999 }],
      },
      {
        is_draft: false,
        date_piece: "2026-03-08",
        lines: [
          { date: "2026-03-08", compte: "7111", debit: 0, credit: 1000 },
          { date: "2026-03-08", compte: "6111", debit: 250, credit: 0 },
        ],
      },
    ]);
    assert.deepEqual(days, [{ date: "2026-03-08", revenue: 1000, charges: 250, invoices: 1 }]);
  });
});
