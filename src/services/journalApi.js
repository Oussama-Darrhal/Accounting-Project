import { toCents } from "@/lib/utils";
import { hasAmount } from "@/hooks/useJournalLines";

/** Drops blank rows and converts amounts to numbers, the shape the backend will expect. */
export function buildJournalPayload(journalLines) {
  return {
    lines: journalLines.filter(hasAmount).map((line) => ({
      date: line.date,
      journal: line.journal,
      facture: line.facture.trim(),
      libelle: line.libelle.trim(),
      compte: line.compte,
      tiers: line.tiers.trim(),
      debit: toCents(line.debit) / 100,
      credit: toCents(line.credit) / 100,
      tva: Number(line.tva),
    })),
  };
}

/** Mock API: replace with a real POST once the backend exists. */
export async function saveJournalEntry(payload) {
  await new Promise((resolve) => setTimeout(resolve, 400));
  console.log("Saved payload:", payload);
  return { id: `EC-${Date.now()}`, ...payload };
}
