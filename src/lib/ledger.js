/** Posted journal entries become grand-livre rows. Drafts stay out of the ledger. */
export function ledgerRowsFromEntries(journalEntries) {
  return (journalEntries ?? [])
    .filter((entry) => entry && !entry.is_draft)
    .flatMap((entry) =>
      (entry.lines ?? []).map((line, index) => ({
        id: `${entry.id}-${index}`,
        date: line.date,
        piece: line.facture || entry.id,
        account: line.compte,
        label: line.libelle || line.tiers || "",
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
      }))
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/** Newest saved entries first, for the dashboard list. */
export function recentEntriesFromJournal(journalEntries) {
  return (journalEntries ?? []).slice(0, 5).map((entry) => {
    const first = entry.lines?.[0] ?? {};
    const amount = (entry.lines ?? []).reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    return {
      id: entry.id,
      date: first.date || entry.savedAt?.slice(0, 10) || "",
      piece: first.facture || entry.id,
      label: first.libelle || "Écriture",
      amount,
      status: entry.is_draft ? "draft" : "validated",
    };
  });
}

export function draftCount(journalEntries) {
  return (journalEntries ?? []).filter((entry) => entry.is_draft).length;
}

/** True when the line totals differ by at least one cent. */
export function payloadIsDraft(lines) {
  const cents = (amount) => Math.round((Number(amount) || 0) * 100);
  const debit = (lines ?? []).reduce((sum, line) => sum + cents(line.debit), 0);
  const credit = (lines ?? []).reduce((sum, line) => sum + cents(line.credit), 0);
  return debit !== credit;
}
