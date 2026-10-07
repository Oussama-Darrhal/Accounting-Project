import { toCents } from "./utils.js";

const TAX_FIELDS = new Set(["ht", "ttc", "tva"]);

/** Formats integer cents as a French amount ("12500,00"). Zero becomes "0,00". */
export function formatCents(cents) {
  const rounded = Math.round(Number(cents) || 0);
  const negative = rounded < 0;
  const absolute = Math.abs(rounded);
  return `${negative ? "-" : ""}${Math.floor(absolute / 100)},${String(absolute % 100).padStart(2, "0")}`;
}

/** Same as formatCents, but an empty grid cell for 0. */
export function formatAmountInput(cents) {
  return Math.round(Number(cents) || 0) === 0 ? "" : formatCents(cents);
}

export function parseRate(tva) {
  const rate = Number(tva);
  return Number.isFinite(rate) && rate >= 0 ? rate : 0;
}

/** Tax on an HT amount: round(HT × rate / 100). */
export function tvaFromHtCents(htCents, rate) {
  if (rate <= 0 || htCents === 0) return 0;
  return Math.round((htCents * rate) / 100);
}

export function ttcFromHtCents(htCents, rate) {
  return htCents + tvaFromHtCents(htCents, rate);
}

/** HT from a TTC amount: round(TTC × 100 / (100 + rate)). */
export function htFromTtcCents(ttcCents, rate) {
  if (rate <= 0) return ttcCents;
  return Math.round((ttcCents * 100) / (100 + rate));
}

/**
 * Which figure this account posts:
 * charges/produits (6/7) → HT, TVA 3455/4455 → tax amount, everything else → TTC.
 */
export function amountRole(compte) {
  const code = String(compte ?? "").trim();
  if (!code) return "ttc";
  if (code.startsWith("3455") || code.startsWith("4455")) return "vat";
  const cls = code[0];
  if (cls === "6" || cls === "7") return "ht";
  return "ttc";
}

export function defaultSide(compte) {
  const code = String(compte ?? "").trim();
  if (code.startsWith("4455") || code.startsWith("4411") || code.startsWith("7")) return "credit";
  return "debit";
}

function activeSide(line) {
  const debit = toCents(line.debit);
  const credit = toCents(line.credit);
  if (debit !== 0 && credit === 0) return "debit";
  if (credit !== 0 && debit === 0) return "credit";
  return defaultSide(line.compte);
}

function postedCentsFromTax(line) {
  const ht = toCents(line.ht);
  const ttc = toCents(line.ttc);
  const role = amountRole(line.compte);
  if (role === "vat") return Math.max(0, ttc - ht);
  if (role === "ht") return ht;
  return ttc;
}

export function applyPostedAmounts(line) {
  if (!String(line.compte ?? "").trim()) return line;
  if (!toCents(line.ht) && !toCents(line.ttc)) {
    return line;
  }
  const formatted = formatAmountInput(postedCentsFromTax(line));
  if (activeSide(line) === "credit") {
    return { ...line, debit: "", credit: formatted };
  }
  return { ...line, debit: formatted, credit: "" };
}

export function fillTaxFromPosted(line, postedCents) {
  const rate = parseRate(line.tva);
  const role = amountRole(line.compte);
  let ht = 0;
  let ttc = 0;
  if (role === "ht") {
    ht = postedCents;
    ttc = ttcFromHtCents(ht, rate);
  } else if (role === "vat") {
    if (rate <= 0) {
      ttc = postedCents;
    } else {
      ht = Math.round((postedCents * 100) / rate);
      ttc = ht + postedCents;
    }
  } else {
    ttc = postedCents;
    ht = htFromTtcCents(ttc, rate);
  }
  return { ...line, ht: formatAmountInput(ht), ttc: formatAmountInput(ttc) };
}

export function hydrateLineAmounts(line) {
  const rate = parseRate(line?.tva);
  let ht = toCents(line?.ht || line?.base_ht);
  let ttc = toCents(line?.ttc);
  const vat = toCents(line?.montant_tva);
  if (!ttc && (ht || vat)) ttc = ht + vat;
  if (ht && ttc) {
    return { ht: formatAmountInput(ht), ttc: formatAmountInput(ttc) };
  }
  if (ht || ttc) {
    if (!ht && ttc) ht = htFromTtcCents(ttc, rate);
    if (!ttc && ht) ttc = ttcFromHtCents(ht, rate);
    return { ht: formatAmountInput(ht), ttc: formatAmountInput(ttc) };
  }
  const posted = toCents(line?.debit) || toCents(line?.credit);
  if (!posted) return { ht: "", ttc: "" };
  const filled = fillTaxFromPosted({ tva: String(line?.tva ?? 20), compte: line?.compte ?? "" }, posted);
  return { ht: filled.ht, ttc: filled.ttc };
}

/** Recalculate HT ↔ TTC from the TVA rate, and restamp débit/crédit from the account. */
export function applyLineChange(line, field, value) {
  if (field === "ht") {
    const ht = toCents(value);
    const next = { ...line, ht: value, ttc: formatAmountInput(ttcFromHtCents(ht, parseRate(line.tva))) };
    return applyPostedAmounts(next);
  }
  if (field === "ttc") {
    const ttc = toCents(value);
    const next = { ...line, ttc: value, ht: formatAmountInput(htFromTtcCents(ttc, parseRate(line.tva))) };
    return applyPostedAmounts(next);
  }
  if (field === "tva") {
    const rate = parseRate(value);
    const next = { ...line, tva: value };
    const ttc = toCents(line.ttc);
    const ht = toCents(line.ht);
    if (ttc) {
      next.ht = formatAmountInput(htFromTtcCents(ttc, rate));
    } else if (ht) {
      next.ttc = formatAmountInput(ttcFromHtCents(ht, rate));
    }
    return applyPostedAmounts(next);
  }
  if (field === "debit") {
    const raw = String(value ?? "");
    const next = { ...line, debit: raw, credit: raw.trim() === "" ? line.credit : "" };
    if (raw.trim() === "") return next;
    return fillTaxFromPosted(next, toCents(raw));
  }
  if (field === "credit") {
    const raw = String(value ?? "");
    const next = { ...line, credit: raw, debit: raw.trim() === "" ? line.debit : "" };
    if (raw.trim() === "") return next;
    return fillTaxFromPosted(next, toCents(raw));
  }
  if (field === "compte") {
    const next = { ...line, compte: value };
    if (toCents(next.ht) || toCents(next.ttc)) return applyPostedAmounts(next);
    const posted = toCents(next.debit) || toCents(next.credit);
    if (posted) return fillTaxFromPosted(next, posted);
    return next;
  }
  return { ...line, [field]: value };
}

/**
 * HT / TTC / TVA on one invoice line also update the other rows that share the same N° facture,
 * so the 6111 / 3455 / 4411 triplet stays consistent.
 */
export function syncInvoiceTax(lines, changedId, field, value) {
  const target = lines.find((line) => line.id === changedId);
  if (!target) return lines;
  const updated = applyLineChange(target, field, value);
  const facture = String(updated.facture ?? "").trim();
  const shareTax = TAX_FIELDS.has(field) && facture !== "";
  return lines.map((line) => {
    if (line.id === changedId) return updated;
    if (!shareTax || String(line.facture ?? "").trim() !== facture) return line;
    return applyPostedAmounts({ ...line, ht: updated.ht, ttc: updated.ttc, tva: updated.tva });
  });
}
