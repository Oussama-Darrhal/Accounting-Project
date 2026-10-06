import { todayISO } from "./dateRange.js";

const KNOWN_RATES = [20, 14, 10, 7, 0];

/** A monetary token with exactly two decimals, in FR or EN grouping. */
const MONEY = String.raw`(\d{1,3}(?:[ \u00a0\u202f]\d{3})+(?:[.,]\d{2})|\d{1,3}(?:\.\d{3})+(?:,\d{2})|\d{1,3}(?:,\d{3})+(?:\.\d{2})|\d+[.,]\d{2})`;

const DATE_TOKEN = String.raw`(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{4}-\d{2}-\d{2})`;

/**
 * Reads a French or Moroccan invoice (text already extracted from the PDF)
 * and returns balanced journal lines for the saisie grid.
 */
export function parseInvoiceText(text) {
  const flat = fold(text).replace(/\n+/g, " ");
  if (!flat) {
    return {
      ok: false,
      reason: "Ce PDF ne contient pas de texte sélectionnable. Saisissez l'écriture à la main, ou déposez une facture numérique.",
    };
  }

  const extracted = {
    ht: findAmount(flat, [
      { weight: 3, pattern: String.raw`total\s*h\.?\s*t\.?(?:\s*net)?[^0-9]{0,24}${MONEY}` },
      { weight: 2, pattern: String.raw`(?:montant|base)\s*h\.?\s*t\.?[^0-9]{0,24}${MONEY}` },
      { weight: 2, pattern: String.raw`hors\s+taxes?[^0-9]{0,24}${MONEY}` },
      { weight: 1, pattern: String.raw`sous\s*-?\s*total\s*h\.?\s*t\.?[^0-9]{0,24}${MONEY}` },
    ]),
    tva: findAmount(flat, [
      { weight: 3, pattern: String.raw`total\s*t\.?\s*v\.?\s*a\.?(?:\s*\(?\s*\d{1,2}\s*%\s*\)?)?[^0-9]{0,16}${MONEY}` },
      { weight: 2, pattern: String.raw`montant\s*tva(?:\s*\(?\s*\d{1,2}\s*%\s*\)?)?[^0-9]{0,16}${MONEY}` },
      { weight: 1, pattern: String.raw`tva\s*\(?\s*\d{1,2}\s*%\s*\)?[^0-9]{0,12}${MONEY}` },
    ]),
    ttc: findAmount(flat, [
      { weight: 4, pattern: String.raw`net\s*a\s*payer[^0-9]{0,24}${MONEY}` },
      { weight: 3, pattern: String.raw`total\s*t\.?\s*t\.?\s*c\.?[^0-9]{0,24}${MONEY}` },
      { weight: 3, pattern: String.raw`montant\s*t\.?\s*t\.?\s*c\.?[^0-9]{0,24}${MONEY}` },
      { weight: 2, pattern: String.raw`toutes\s+taxes\s+comprises[^0-9]{0,24}${MONEY}` },
      { weight: 2, pattern: String.raw`total\s*a\s*payer[^0-9]{0,24}${MONEY}` },
      { weight: 1, pattern: String.raw`total\s*general[^0-9]{0,24}${MONEY}` },
    ]),
  };

  const rates = findRates(flat);
  const exempt = /exoner|sans tva|tva non applicable/.test(flat);
  const reconciled = reconcile(extracted, rates, exempt);
  if (!reconciled) {
    return {
      ok: false,
      reason: "Aucun montant HT ou TTC n'a été reconnu. La facture reste affichée : saisissez l'écriture à la main.",
    };
  }

  const number = findInvoiceNumber(flat);
  const foundDate = findDate(flat);
  const date = foundDate || todayISO();
  const { kind, creditNote, assumedKind } = analyzeKind(flat);
  const accounts = accountsFor(kind, flat);
  const party = findParty(flat, kind);
  const lines = buildLines({
    date,
    number,
    kind,
    creditNote,
    rate: reconciled.rate,
    htCents: reconciled.htCents,
    tvaCents: reconciled.tvaCents,
    ttcCents: reconciled.ttcCents,
    accounts,
    journal: kind === "sale" ? "VT" : "ACH",
    libelle: findLibelle(flat, number, kind, creditNote),
    tiers: party ? `${accounts.counterparty} - ${party}` : "",
  });

  const warnings = [...reconciled.warnings];
  if (rates.length > 1 && new Set(rates).size > 1) {
    warnings.push("Plusieurs taux de TVA détectés. La TVA totale est portée sur une seule ligne : vérifiez-la.");
  }
  if (!number) warnings.push("Numéro de facture introuvable.");
  if (!foundDate) warnings.push("Date du jour utilisée.");
  if (assumedKind) warnings.push("Écriture d'achat proposée par défaut. Changez les comptes s'il s'agit d'une vente.");

  return {
    ok: true,
    summary: describe({ kind, creditNote, number, rate: reconciled.rate, htCents: reconciled.htCents, ttcCents: reconciled.ttcCents }),
    warnings,
    lines,
    kind,
    creditNote,
    number,
    date,
    rate: reconciled.rate,
    htCents: reconciled.htCents,
    tvaCents: reconciled.tvaCents,
    ttcCents: reconciled.ttcCents,
  };
}

/** Parses "12 500,00", "12.500,00" and "1,250.00" into a number of dirhams. */
export function parseAmount(raw) {
  if (raw == null) return null;
  let source = String(raw).replace(/[\s\u00a0\u202f]/g, "").replace(/[^\d,.-]/g, "");
  if (!/\d/.test(source)) return null;
  const negative = source.startsWith("-");
  source = source.replace(/-/g, "");

  const comma = source.lastIndexOf(",");
  const dot = source.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    source = comma > dot ? source.replace(/\./g, "").replace(",", ".") : source.replace(/,/g, "");
  } else if (comma >= 0) {
    const fraction = source.length - comma - 1;
    source = fraction === 2 ? source.replace(",", ".") : source.replace(/,/g, "");
  } else if (dot >= 0) {
    const fraction = source.length - dot - 1;
    if (fraction === 2) {
      source = `${source.slice(0, dot).replace(/\./g, "")}.${source.slice(dot + 1)}`;
    } else if (fraction === 3) {
      source = source.replace(/\./g, "");
    }
  }

  const value = Number(source);
  if (!Number.isFinite(value)) return null;
  return Math.round((negative ? -value : value) * 100) / 100;
}

function fold(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[ \t\u00a0\u202f]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function findAmount(text, patterns) {
  let best = null;
  for (const { weight, pattern } of patterns) {
    const expression = new RegExp(pattern, "gi");
    let match = expression.exec(text);
    while (match) {
      const amount = parseAmount(match[1]);
      if (amount != null && amount > 0 && (!best || weight > best.weight || (weight === best.weight && match.index >= best.index))) {
        best = { amount, weight, index: match.index };
      }
      match = expression.exec(text);
    }
  }
  return best?.amount ?? null;
}

function findRates(text) {
  const rates = [];
  const expression = /(?:tva|taux)[^\d%]{0,18}(20|14|10|7|0)\s*%/gi;
  let match = expression.exec(text);
  while (match) {
    rates.push(Number(match[1]));
    match = expression.exec(text);
  }
  return rates;
}

function closestRate(value) {
  return KNOWN_RATES.reduce((best, rate) => (Math.abs(rate - value) < Math.abs(best - value) ? rate : best));
}

function reconcile(extracted, rates, exempt) {
  let { ht, tva, ttc } = extracted;
  const warnings = [];
  let rate = rates.at(-1) ?? null;

  if (exempt && (tva == null || tva === 0)) {
    tva = 0;
    rate = 0;
  }
  if (rate === 0 && tva != null && tva > 0) rate = null;
  if (tva == null && ht != null && ttc != null && ttc >= ht) {
    tva = (toCents(ttc) - toCents(ht)) / 100;
  }

  if (rate == null && ht != null && tva != null && ht > 0) {
    const actual = (tva / ht) * 100;
    rate = closestRate(actual);
    if (Math.abs(actual - rate) > 1) {
      warnings.push("Le taux de TVA ne correspond pas à un taux marocain standard. Le montant de TVA lu sur le PDF est conservé.");
    }
  }
  if (rate == null) {
    rate = 20;
    warnings.push("Taux de TVA supposé à 20 %.");
  }

  if (ht == null && ttc != null) {
    const ttcCents = toCents(ttc);
    const htCents = Math.round(ttcCents / (1 + rate / 100));
    ht = htCents / 100;
    if (tva == null) tva = (ttcCents - htCents) / 100;
  }
  if (tva == null && ht != null) tva = Math.round(toCents(ht) * rate / 100) / 100;
  if (ttc == null && ht != null && tva != null) ttc = (toCents(ht) + toCents(tva)) / 100;
  if (ht == null || tva == null || ttc == null) return null;

  let htCents = toCents(ht);
  let tvaCents = toCents(tva);
  let ttcCents = toCents(ttc);
  if (htCents + tvaCents !== ttcCents) {
    if (Math.abs(htCents + tvaCents - ttcCents) <= 2) {
      tvaCents = ttcCents - htCents;
    } else if (extracted.ht != null && extracted.tva != null) {
      ttcCents = htCents + tvaCents;
      warnings.push("Les totaux du PDF ne se recoupent pas. L'écriture est équilibrée sur HT + TVA.");
    } else if (extracted.ttc != null && extracted.ht != null) {
      tvaCents = ttcCents - htCents;
      warnings.push("La TVA a été déduite du TTC et du HT.");
    } else {
      ttcCents = htCents + tvaCents;
    }
  }

  if (htCents <= 0 || ttcCents <= 0 || tvaCents < 0) return null;
  return { htCents, tvaCents, ttcCents, rate, warnings };
}

function findInvoiceNumber(text) {
  const labeled = [
    /(?:facture|avoir|invoice)(?:\s+[a-z]+){0,4}\s*n[°ºo.]*(?:\s*[:.-])?\s*([a-z0-9][a-z0-9/-]{1,30})/i,
    /n[°ºo.]\s*(?:de\s*)?facture\s*[:.-]?\s*([a-z0-9][a-z0-9/-]{1,30})/i,
    /\b((?:fa|ff|av|fv|fc)[-/]?\d[\w/-]{1,20})\b/i,
  ];
  for (const expression of labeled) {
    const match = text.match(expression);
    const number = match?.[1]?.replace(/\s+/g, "") ?? "";
    if (number && /\d/.test(number)) return number.toUpperCase();
  }
  return "";
}

function findDate(text) {
  const labeled = text.match(new RegExp(String.raw`(?:date(?:\s+de(?:\s+la)?\s+facture)?|facturee?\s+le)\s*[:.-]?\s*${DATE_TOKEN}`, "i"));
  const loose = labeled ?? text.match(new RegExp(DATE_TOKEN));
  return loose ? toISO(loose[1]) : "";
}

function toISO(raw) {
  let day;
  let month;
  let year;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else {
    const match = raw.match(/^(\d{1,2})[/.\\-](\d{1,2})[/.\\-](\d{2,4})$/);
    if (!match) return "";
    day = Number(match[1]);
    month = Number(match[2]);
    year = Number(match[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
  }
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
  const pad = (value) => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

function analyzeKind(text) {
  const creditNote = /\bavoir\b|note de credit/.test(text);
  const purchase = /facture d'achat|facture fournisseur|\bfournisseur\b|\bachat\b/.test(text);
  const sale = /facture de vente|facture client|note d'honoraires|\bvente\b/.test(text);
  if (sale && !purchase) return { kind: "sale", creditNote, assumedKind: false };
  if (purchase && !sale) return { kind: "purchase", creditNote, assumedKind: false };
  if (purchase && sale) {
    if (/facture de vente|facture client/.test(text) && !/facture fournisseur|facture d'achat/.test(text)) {
      return { kind: "sale", creditNote, assumedKind: false };
    }
    return { kind: "purchase", creditNote, assumedKind: false };
  }
  return { kind: "purchase", creditNote, assumedKind: true };
}

function accountsFor(kind, text) {
  const service = /prestation|service|honoraire/.test(text);
  const rent = /\bloyer\b/.test(text);
  if (kind === "sale") {
    return { product: service ? "7121" : "7111", counterparty: "3421", vat: "4455" };
  }
  return { product: rent ? "6131" : service ? "6125" : "6111", counterparty: "4411", vat: "3455" };
}

function buildLines({ date, number, kind, creditNote, rate, htCents, tvaCents, ttcCents, accounts, journal, libelle, tiers }) {
  const details = { date, number, rate, journal, libelle, tiers, counterparty: accounts.counterparty, htCents, ttcCents };
  const product = entryLine(details, accounts.product, kind === "sale" ? 0 : htCents, kind === "sale" ? htCents : 0);
  const vat = entryLine(details, accounts.vat, kind === "sale" ? 0 : tvaCents, kind === "sale" ? tvaCents : 0);
  const counterparty = entryLine(details, accounts.counterparty, kind === "sale" ? ttcCents : 0, kind === "sale" ? 0 : ttcCents);
  const lines = kind === "sale" ? [counterparty, product] : [product];
  if (tvaCents > 0) lines.push(vat);
  if (kind !== "sale") lines.push(counterparty);
  if (!creditNote) return lines;
  return lines.map((line) => ({ ...line, debit: line.credit, credit: line.debit }));
}

function entryLine(details, compte, debitCents, creditCents) {
  return {
    date: details.date,
    journal: details.journal,
    facture: details.number,
    libelle: details.libelle,
    compte,
    tiers: compte === details.counterparty ? details.tiers : "",
    ht: details.htCents ? formatCents(details.htCents) : "",
    ttc: details.ttcCents ? formatCents(details.ttcCents) : "",
    debit: debitCents ? formatCents(debitCents) : "",
    credit: creditCents ? formatCents(creditCents) : "",
    tva: String(details.rate),
  };
}

function findParty(text, kind) {
  const supplier = captureName(text, "fournisseur");
  const client = captureName(text, "client");
  if (kind === "sale") return client || supplier;
  return supplier || client;
}

function captureName(text, label) {
  const match = text.match(
    new RegExp(
      String.raw`${label}\s*[:\-]\s*([a-z0-9][a-z0-9 '&._-]{0,48}?)(?=\s+(?:total|tva|montant|net|date|facture|prestation|designation|ht|ttc)\b|$)`,
      "i"
    )
  );
  return match ? titleCase(match[1].trim()) : "";
}

function findLibelle(text, number, kind, creditNote) {
  const labeled = text.match(
    /(?:designation|libelle|objet)\s*[:\-]\s*([a-z0-9][a-z0-9 '&._-]{1,60}?)(?=\s+(?:total|tva|montant|net)\b|$)/i
  );
  if (labeled?.[1]) return titleCase(labeled[1].trim());
  const prefix = creditNote ? "Avoir" : kind === "sale" ? "Vente" : "Achat";
  return number ? `${prefix} ${number}` : prefix;
}

function titleCase(value) {
  return value.replace(/\p{L}+/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

function describe({ kind, creditNote, number, rate, htCents, ttcCents }) {
  const label = creditNote
    ? kind === "sale" ? "Avoir client" : "Avoir fournisseur"
    : kind === "sale" ? "Vente" : "Achat";
  return `${label} · ${number || "sans numéro"} · HT ${formatCents(htCents)} · TVA ${rate} % · TTC ${formatCents(ttcCents)}`;
}

function formatCents(cents) {
  const negative = cents < 0;
  const absolute = Math.abs(cents);
  return `${negative ? "-" : ""}${Math.floor(absolute / 100)},${String(absolute % 100).padStart(2, "0")}`;
}

function toCents(amount) {
  return Math.round(amount * 100);
}
