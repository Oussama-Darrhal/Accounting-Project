import { amountRole } from "./tva.js";
import { toCents } from "./utils.js";

function partyName(line) {
  const raw = String(line?.tiers ?? "");
  return raw.replace(/^\d+\s*-\s*/, "").trim();
}

/**
 * One purchase/sale invoice is posted as HT + TVA + TTC. This builds the recap
 * so the intern does not add the three TTC cells together.
 */
export function describeInvoiceSplit(lines) {
  const posted = (lines ?? []).filter((line) => toCents(line.debit) || toCents(line.credit));
  if (posted.length < 2) return null;

  const charge = posted.find((line) => amountRole(line.compte) === "ht");
  const vat = posted.find((line) => amountRole(line.compte) === "vat");
  const party = posted.find((line) => amountRole(line.compte) === "ttc");
  if (!charge || !party) return null;

  const htCents = toCents(charge.ht) || toCents(charge.debit) || toCents(charge.credit);
  const ttcCents = toCents(party.ttc) || toCents(party.credit) || toCents(party.debit);
  if (!htCents || !ttcCents) return null;

  const tvaCents = vat
    ? toCents(vat.debit) || toCents(vat.credit) || Math.max(0, ttcCents - htCents)
    : Math.max(0, ttcCents - htCents);
  const rate = String(charge.tva || vat?.tva || party.tva || "");
  const kind = String(charge.compte ?? "").startsWith("7") ? "sale" : "purchase";
  const supplier = partyName(party);

  return {
    kind,
    facture: String(charge.facture || party.facture || "").trim(),
    htCents,
    tvaCents,
    ttcCents,
    rate,
    supplier,
  };
}
