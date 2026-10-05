import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { draftCount, ledgerRowsFromEntries, payloadIsDraft, recentEntriesFromJournal } from "./ledger.js";

const posted = {
  id: "EC-1",
  is_draft: false,
  savedAt: "2026-03-01T10:00:00.000Z",
  lines: [
    { date: "2026-03-01", facture: "FF-1", libelle: "Achat", compte: "6111", tiers: "", debit: 100, credit: 0 },
    { date: "2026-03-01", facture: "FF-1", libelle: "Achat", compte: "4411", tiers: "4411 - Sud", debit: 0, credit: 100 },
  ],
};

const draft = {
  id: "EC-2",
  is_draft: true,
  savedAt: "2026-03-02T10:00:00.000Z",
  lines: [{ date: "2026-03-02", facture: "FF-2", libelle: "Brouillon", compte: "6111", debit: 50, credit: 0 }],
};

describe("ledger helpers", () => {
  it("keeps drafts out of the grand livre and flattens posted lines", () => {
    const rows = ledgerRowsFromEntries([draft, posted]);
    assert.deepEqual(
      rows.map((row) => [row.account, row.debit, row.credit]),
      [
        ["6111", 100, 0],
        ["4411", 0, 100],
      ]
    );
  });

  it("counts drafts and lists the newest entries first", () => {
    const entries = [draft, posted];
    assert.equal(draftCount(entries), 1);
    const recent = recentEntriesFromJournal(entries);
    assert.equal(recent[0].status, "draft");
    assert.equal(recent[1].status, "validated");
    assert.equal(recent[1].amount, 100);
  });

  it("flags an unbalanced payload as a draft", () => {
    assert.equal(payloadIsDraft([{ debit: 10, credit: 0 }]), true);
    assert.equal(payloadIsDraft([{ debit: 10.1, credit: 0 }, { debit: 0, credit: 10.1 }]), false);
  });
});
