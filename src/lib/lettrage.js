import { toCents } from "./utils.js";

export function isTiersPrefix(code, prefix) {
  return String(code || "").startsWith(prefix);
}

/** Posted 34/44 (and auxiliary) lines for the lettrage grid. */
export function tiersLinesFromEntries(journalEntries, prefix) {
  return (journalEntries ?? [])
    .filter((entry) => entry && !entry.is_draft)
    .flatMap((entry) =>
      (entry.lines ?? [])
        .filter((line) => isTiersPrefix(line.compte, prefix))
        .map((line) => ({
          id: line.id,
          date: line.date || entry.date_piece || "",
          piece: line.facture || entry.reference_piece || entry.id,
          label: line.libelle || line.tiers || "",
          account: line.compte,
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
          lettrage_code: line.lettrage_code || null,
        }))
    )
    .filter((line) => line.id)
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)));
}

export function lettrageSelection(lines) {
  const debitCents = (lines ?? []).reduce((sum, line) => sum + toCents(line.debit), 0);
  const creditCents = (lines ?? []).reduce((sum, line) => sum + toCents(line.credit), 0);
  const remainderCents = Math.abs(debitCents - creditCents);
  return {
    count: lines?.length ?? 0,
    debit: debitCents / 100,
    credit: creditCents / 100,
    remainder: remainderCents / 100,
    canExact: (lines?.length ?? 0) >= 2 && remainderCents === 0 && debitCents > 0,
    canRemainder: (lines?.length ?? 0) >= 2 && remainderCents > 0 && debitCents > 0 && creditCents > 0,
  };
}

export function tiersOptionLabels(accounts) {
  const byId = Object.fromEntries((accounts ?? []).map((account) => [String(account.id), account]));
  return (accounts ?? [])
    .filter((account) => account.parent_id)
    .map((account) => {
      const parent = byId[String(account.parent_id)];
      const collective = parent?.code || account.parent_code || account.code;
      return `${collective} - ${account.name}`;
    });
}
