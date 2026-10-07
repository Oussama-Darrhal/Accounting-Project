import { todayISO } from "./dateRange.js";
import { parseFrenchAmountWords } from "./frenchAmountWords.js";

const KNOWN_RATES = [20, 14, 10, 7, 0];

/** A monetary token with two decimals, grouped thousands, or a bare integer when OCR dropped the comma. */
const MONEY = String.raw`(\d{1,3}(?:[ \u00a0\u202f]\d{3})+(?:[.,]\d{2})?|\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+[.,]\d{2}|\d{4,})`;
const CURRENCY = String.raw`(?:\s*(?:dhs?|mad|dh|€))?`;
const DATE_TOKEN = String.raw`(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{4}-\d{2}-\d{2})`;
const MONTH_TOKEN = String.raw`(?:janvier|janv\.?|fevrier|fevr\.?|mars|avril|avr\.?|mai|juin|juillet|juil\.?|aout|aou\.?|septembre|sept\.?|octobre|oct\.?|novembre|nov\.?|decembre|dec\.?)`;
const FRENCH_DATE = String.raw`(\d{1,2}\s+${MONTH_TOKEN}\s+\d{2,4})`;

const MONTHS = {
  janvier: 1,
  janv: 1,
  fevrier: 2,
  fevr: 2,
  mars: 3,
  avril: 4,
  avr: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  juil: 7,
  aout: 8,
  aou: 8,
  septembre: 9,
  sept: 9,
  octobre: 10,
  oct: 10,
  novembre: 11,
  nov: 11,
  decembre: 12,
  dec: 12,
};

const LEGAL_STOPWORDS = new Set([
  "toutes",
  "taxes",
  "comprises",
  "montant",
  "total",
  "facture",
  "designation",
  "service",
  "capital",
  "adresse",
  "telephone",
  "presente",
  "arreter",
  "arrete",
]);

/**
 * Reads a French or Moroccan invoice (text already extracted from the PDF or OCR)
 * and returns balanced journal lines for the saisie grid.
 */
export function parseInvoiceText(text, options = {}) {
  const company = options.company ?? null;
  const flat = fold(text).replace(/\n+/g, " ");
  if (!flat) {
    return {
      ok: false,
      reason:
        "Ce document ne contient pas de texte lisible. Saisissez l'écriture à la main, ou déposez une facture numérique plus nette.",
    };
  }

  const rates = findRates(flat);
  const extracted = pickAmounts(flat, rates);
  const exempt = /exoner|sans tva|tva non applicable/.test(flat);
  const reconciled = reconcile(extracted, rates, exempt);
  if (!reconciled) {
    return {
      ok: false,
      reason: "Aucun montant HT ou TTC n'a été reconnu. La facture reste affichée : saisissez l'écriture à la main.",
    };
  }

  const number = findInvoiceNumber(flat);
  const dateInfo = findDate(flat);
  const date = dateInfo.iso || todayISO();
  const client = findClient(flat);
  const issuer = findIssuer(flat, client);
  const { kind, creditNote, assumedKind } = analyzeKind(flat, company, client, issuer);
  const accounts = accountsFor(kind, flat);
  const party = findParty({ kind, client, issuer, company });
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
  if (dateInfo.clamped) {
    warnings.push(`Date ${dateInfo.raw} corrigée au ${formatIsoDate(date)}.`);
  } else if (!dateInfo.iso) {
    warnings.push("Date du jour utilisée.");
  }
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

/** OCR often drops the decimal comma: 1740909 → 17 409,09. */
function parseInvoiceAmount(raw) {
  const source = String(raw ?? "");
  const stripped = source.replace(/[\s\u00a0\u202f]/g, "").replace(/[^\d,.-]/g, "");
  if (/[.,]/.test(stripped)) return parseAmount(raw);
  const digits = stripped.replace(/\D/g, "");
  if (digits.length >= 6) return parseAmount(`${digits.slice(0, -2)},${digits.slice(-2)}`);
  if (digits.length >= 4) return parseAmount(`${digits},00`);
  return parseAmount(raw);
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

function collectAmounts(text, specs) {
  const found = [];
  for (const spec of specs) {
    const expression = new RegExp(spec.pattern, "gi");
    let match = expression.exec(text);
    while (match) {
      const amount = parseInvoiceAmount(match[1]);
      if (amount != null && amount > 0 && !isIgnoredAmount(text, match.index)) {
        found.push({ amount, weight: spec.weight, index: match.index });
      }
      match = expression.exec(text);
    }
  }
  return uniqueAmounts(found);
}

function uniqueAmounts(candidates) {
  const seen = new Map();
  for (const candidate of candidates) {
    const key = toCents(candidate.amount);
    const previous = seen.get(key);
    if (!previous || candidate.weight > previous.weight || (candidate.weight === previous.weight && candidate.index >= previous.index)) {
      seen.set(key, candidate);
    }
  }
  return [...seen.values()].sort((a, b) => b.weight - a.weight || b.index - a.index);
}

function isIgnoredAmount(text, index) {
  const window = text.slice(Math.max(0, index - 32), Math.min(text.length, index + 12));
  return /\bcapital\b/.test(window);
}

function labeledMoney(label, { weight, reverseWeight = weight } = {}) {
  return [
    { weight, pattern: String.raw`${label}[^0-9]{0,22}${MONEY}` },
    { weight: reverseWeight, pattern: String.raw`${MONEY}${CURRENCY}[^0-9]{0,14}${label}` },
  ];
}

function pickAmounts(text, rates) {
  const ht = collectAmounts(text, [
    ...labeledMoney(String.raw`(?:montant|base)\s*h\.?\s*t\.?`, { weight: 4 }),
    ...labeledMoney(String.raw`total\s*h\.?\s*t\.?(?:\s*net)?`, { weight: 3 }),
    ...labeledMoney(String.raw`hors\s+taxes?`, { weight: 2 }),
    ...labeledMoney(String.raw`sous\s*-?\s*total\s*h\.?\s*t\.?`, { weight: 1 }),
  ]);
  const tvaHits = collectAmounts(text, [
    ...labeledMoney(String.raw`total\s*t\.?\s*v\.?\s*a\.?(?:\s*\(?\s*\d{1,2}\s*%\s*\)?)?`, { weight: 3 }),
    ...labeledMoney(String.raw`montant\s*tva(?:\s*\(?\s*\d{1,2}\s*%\s*\)?)?`, { weight: 2 }),
    ...labeledMoney(String.raw`tva\s*\(?\s*\d{1,2}\s*%\s*\)?`, { weight: 2 }),
  ]);
  let ttc = collectAmounts(text, [
    ...labeledMoney(String.raw`montant\s+total\s*t\.?\s*t\.?\s*c\.?`, { weight: 5 }),
    ...labeledMoney(String.raw`net\s*a\s*payer`, { weight: 4 }),
    ...labeledMoney(String.raw`total\s*t\.?\s*t\.?\s*c\.?`, { weight: 4 }),
    ...labeledMoney(String.raw`totalt+i?c`, { weight: 4 }),
    ...labeledMoney(String.raw`montant\s*t\.?\s*t\.?\s*c\.?`, { weight: 3 }),
    ...labeledMoney(String.raw`total\s*a\s*payer`, { weight: 2 }),
    ...labeledMoney(String.raw`toutes\s+taxes\s+comprises`, { weight: 1, reverseWeight: 0 }),
    ...labeledMoney(String.raw`total\s*general`, { weight: 1 }),
  ]);
  const spokenTtc = parseFrenchAmountWords(text);
  if (spokenTtc != null) {
    ttc = uniqueAmounts([...ttc, { amount: spokenTtc, weight: 6, index: 0 }]);
  }
  const impliedTtc = implyTtcFromHt(text, ht, ttc);
  if (impliedTtc.length) ttc = uniqueAmounts([...ttc, ...impliedTtc]);

  const ttcCents = new Set(ttc.map((hit) => toCents(hit.amount)));
  const htCents = new Set(ht.map((hit) => toCents(hit.amount)));
  const tva = tvaHits.filter((hit) => !ttcCents.has(toCents(hit.amount)) && !htCents.has(toCents(hit.amount)));

  const rate = rates.at(-1) ?? null;
  const hts = ht.length ? ht.slice(0, 6) : [null];
  const tvas = tva.length ? tva.slice(0, 6) : [null];
  const ttcs = ttc.length ? ttc.slice(0, 6) : [null];

  let best = null;
  for (const htHit of hts) {
    for (const tvaHit of tvas) {
      for (const ttcHit of ttcs) {
        const score = scoreTriplet(htHit, tvaHit, ttcHit, rate);
        if (!best || score > best.score) best = { htHit, tvaHit, ttcHit, score };
      }
    }
  }

  return {
    ht: best?.htHit?.amount ?? null,
    tva: best?.tvaHit?.amount ?? null,
    ttc: best?.ttcHit?.amount ?? null,
  };
}

function scoreTriplet(htHit, tvaHit, ttcHit, rate) {
  if (!htHit && !ttcHit) return -1000;
  let score = (htHit?.weight ?? 0) + (tvaHit?.weight ?? 0) + (ttcHit?.weight ?? 0);
  const htCents = htHit ? toCents(htHit.amount) : null;
  const tvaCents = tvaHit ? toCents(tvaHit.amount) : null;
  const ttcCents = ttcHit ? toCents(ttcHit.amount) : null;

  if (htCents != null && ttcCents != null && ttcCents < htCents) score -= 40;

  if (htCents != null && tvaCents != null && ttcCents != null) {
    const delta = Math.abs(htCents + tvaCents - ttcCents);
    score += delta <= 2 ? 80 : -Math.min(50, Math.floor(delta / 50));
  } else if (htCents != null && ttcCents != null) {
    const implied = ttcCents - htCents;
    if (implied >= 0) {
      score += 15;
      const knownMatch = KNOWN_RATES.some((known) => {
        if (known <= 0) return false;
        return Math.abs(Math.round((htCents * known) / 100) - implied) <= 2;
      });
      if (knownMatch) score += 35;
      if (rate != null) {
        const expected = Math.round((htCents * rate) / 100);
        if (Math.abs(expected - implied) <= 2) score += 10;
      }
    }
  } else if (ttcCents != null && tvaCents != null && ttcCents > tvaCents) {
    score += 5;
  }

  const latest = Math.max(htHit?.index ?? 0, tvaHit?.index ?? 0, ttcHit?.index ?? 0);
  score += Math.min(8, latest / 400);
  return score;
}

/**
 * When the TTC label is missing, keep an amount that equals HT at a Moroccan rate
 * (17 409,09 at 10 % → 19 150) instead of rebuilding TTC at 20 %.
 */
function implyTtcFromHt(text, htHits, existingTtc) {
  if (!htHits.length) return [];
  const already = new Set(existingTtc.map((hit) => toCents(hit.amount)));
  const loose = collectAmounts(text, [{ weight: 2, pattern: MONEY }]);
  const extras = [];
  for (const htHit of htHits.slice(0, 4)) {
    const htCents = toCents(htHit.amount);
    for (const rate of KNOWN_RATES) {
      if (rate <= 0) continue;
      const expected = Math.round((htCents * (100 + rate)) / 100);
      if (already.has(expected)) continue;
      const hit = loose.find(
        (candidate) => Math.abs(toCents(candidate.amount) - expected) <= 2 && toCents(candidate.amount) !== htCents
      );
      if (hit) extras.push({ amount: hit.amount, weight: 4, index: hit.index });
    }
  }
  return extras;
}

function findRates(text) {
  const rates = [];
  const expression = /(?:tva|taux|total)[^\d%]{0,18}(20|14|10|7|0)\s*%/gi;
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

  if (ht != null && ttc != null && ht > 0 && ttc >= ht) {
    const actual = ((ttc - ht) / ht) * 100;
    const implied = closestRate(actual);
    if (Math.abs(actual - implied) <= 1) {
      if (rate != null && rate !== implied) {
        warnings.push(`Taux ${rate} % lu sur la pièce, mais HT et TTC correspondent à ${implied} %.`);
      }
      rate = implied;
    }
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
  if (tva == null && ht != null) tva = Math.round((toCents(ht) * rate) / 100) / 100;
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
    /(?:facture|avoir|invoice)(?:\s+[a-z]+){0,4}\s*n[°ºo.]*(?:\s*[:.-])?\s*((?:fa|ff|av|fv|fc)?[-/]?\d+(?:\s*\/\s*\d{2,4})?(?:[-/]\d+)*)/i,
    /n[°ºo.]\s*(?:de\s*)?facture\s*[:.-]?\s*((?:fa|ff|av|fv|fc)?[-/]?\d+(?:\s*\/\s*\d{2,4})?(?:[-/]\d+)*)/i,
    /\b((?:fa|ff|av|fv|fc)[-/]?\d[\w/-]{0,20})\b/i,
  ];
  for (const expression of labeled) {
    const match = text.match(expression);
    const number = match?.[1]?.replace(/\s+/g, "") ?? "";
    if (number && /\d/.test(number) && number.replace(/\D/g, "").length <= 12) return number.toUpperCase();
  }
  return "";
}

function findDate(text) {
  const candidates = [];
  const push = (raw, weight) => {
    if (!raw) return;
    candidates.push({ raw: raw.trim(), weight });
  };

  push(text.match(new RegExp(String.raw`date(?:\s+de(?:\s+la)?\s+facture)?\s*[:.-]?\s*${DATE_TOKEN}`, "i"))?.[1], 5);
  push(text.match(new RegExp(String.raw`date(?:\s+de(?:\s+la)?\s+facture)?\s*[:.-]?\s*${FRENCH_DATE}`, "i"))?.[1], 5);
  push(text.match(new RegExp(String.raw`(?:facturee?\s+le)\s*[:.-]?\s*${DATE_TOKEN}`, "i"))?.[1], 4);
  push(
    text.match(
      new RegExp(
        String.raw`(?:casablanca|rabat|marrakech|tanger|fes|agadir|oujda)?\s*le\s*[:.-]?\s*${FRENCH_DATE}`,
        "i"
      )
    )?.[1],
    4
  );

  const period = text.match(new RegExp(String.raw`\bdu\s+${DATE_TOKEN}\s+au\s+${DATE_TOKEN}`, "i"));
  const skip = new Set([period?.[1], period?.[2]].filter(Boolean));
  const loose = new RegExp(DATE_TOKEN, "g");
  let match = loose.exec(text);
  while (match) {
    if (!skip.has(match[1])) push(match[1], 1);
    match = loose.exec(text);
  }

  candidates.sort((a, b) => b.weight - a.weight);
  for (const candidate of candidates) {
    const parsed = toISO(candidate.raw);
    if (parsed.iso) return { ...parsed, raw: candidate.raw };
  }
  return { iso: "", clamped: false, raw: "" };
}

function toISO(raw) {
  let day;
  let month;
  let year;
  const source = String(raw ?? "").trim();
  const iso = source.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const numeric = source.match(/^(\d{1,2})[/.\\-](\d{1,2})[/.\\-](\d{2,4})$/);
  const french = source.match(/^(\d{1,2})\s+([a-z.]+)\s+(\d{2,4})$/i);

  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (french && MONTHS[french[2].replace(/\./g, "")]) {
    day = Number(french[1]);
    month = MONTHS[french[2].replace(/\./g, "")];
    year = Number(french[3]);
  } else if (numeric) {
    day = Number(numeric[1]);
    month = Number(numeric[2]);
    year = Number(numeric[3]);
  } else {
    return { iso: "", clamped: false };
  }

  if (year < 100) year += year >= 70 ? 1900 : 2000;
  if (!month || month < 1 || month > 12 || !day || day < 1) return { iso: "", clamped: false };

  const lastDay = new Date(year, month, 0).getDate();
  const clamped = day > lastDay;
  if (clamped) day = lastDay;

  const pad = (value) => String(value).padStart(2, "0");
  return { iso: `${year}-${pad(month)}-${pad(day)}`, clamped };
}

function analyzeKind(text, company, client, issuer) {
  const creditNote = /\bavoir\b|note de credit/.test(text);
  const weAreClient = matchesCompany(client, company);
  const weAreIssuer = matchesCompany(issuer, company);
  if (weAreClient && !weAreIssuer) return { kind: "purchase", creditNote, assumedKind: false };
  if (weAreIssuer && !weAreClient) return { kind: "sale", creditNote, assumedKind: false };

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
  const product = entryLine(
    { ...details, libelle: `${libelle} · HT` },
    accounts.product,
    kind === "sale" ? 0 : htCents,
    kind === "sale" ? htCents : 0
  );
  const vat = entryLine(
    { ...details, libelle: `TVA ${rate} %${number ? ` · ${number}` : ""}` },
    accounts.vat,
    kind === "sale" ? 0 : tvaCents,
    kind === "sale" ? tvaCents : 0
  );
  const counterparty = entryLine(
    { ...details, libelle: kind === "sale" ? `${libelle} · TTC` : `Fournisseur · TTC` },
    accounts.counterparty,
    kind === "sale" ? ttcCents : 0,
    kind === "sale" ? 0 : ttcCents
  );
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

function findClient(text) {
  return captureName(text, "client") || captureName(text, "societe") || captureName(text, "destinataire");
}

function findParty({ kind, client, issuer, company }) {
  if (kind === "sale") {
    if (matchesCompany(client, company)) return issuer || "";
    return client || issuer || "";
  }
  if (matchesCompany(issuer, company)) return client || "";
  return issuer || client || "";
}

function findIssuer(text, clientName) {
  const legal = [...text.matchAll(
    /\b([a-z0-9][a-z0-9&.']{0,40}(?:\s+[a-z0-9&.']{1,24}){0,4}\s+(?:sarlau|sarl|s\.a\.r\.l\.u?|sa))\b/gi
  )]
    .map((match) => titleCase(match[1].replace(/^\d+\s+/, "").replace(/\s+/g, " ").trim()))
    .filter((name) => name && !/^\d/.test(name) && looksLikeCompany(name))
    .filter((name) => !clientName || !sameParty(name, clientName))
    .sort((left, right) => right.length - left.length);
  if (legal[0]) return legal[0];

  const brands = [
    ...text.matchAll(/[a-z0-9._%+-]+@([a-z0-9-]+)\./gi),
    ...text.matchAll(/www\.([a-z0-9-]+)/gi),
  ];
  const skipHost = new Set(["gmail", "yahoo", "hotmail", "outlook", "google", "icloud"]);
  for (const match of brands) {
    const brand = match[1];
    if (!brand || skipHost.has(brand.toLowerCase())) continue;
    if (clientName && sameParty(brand, clientName)) continue;
    return brand.toUpperCase();
  }

  const supplier = captureName(text, "fournisseur");
  if (supplier && (!clientName || !sameParty(supplier, clientName))) return supplier;
  return "";
}

function looksLikeCompany(name) {
  const words = fold(name).split(/[^a-z0-9&]+/).filter(Boolean);
  const meaningful = words.filter(
    (word) => /[a-z]/i.test(word) && !LEGAL_STOPWORDS.has(word) && !/^(sarlau|sarl|sa)$/.test(word)
  );
  return meaningful.length > 0;
}

function captureName(text, label) {
  const match = text.match(
    new RegExp(
      String.raw`${label}\s*[:\-]\s*([a-z0-9][a-z0-9 '&._-]{0,48}?)(?=\s+(?:total|tva|montant|net|date|facture|prestation|designation|base|ht|ttc|ice|tel|objet)\b|\s+\d+[ \u00a0\u202f.,]\d|$)`,
      "i"
    )
  );
  return match ? titleCase(match[1].trim()) : "";
}

function findLibelle(text, number, kind, creditNote) {
  if (/service\s+transfers?/.test(text)) return "Service Transfers";
  const labeled = text.match(
    /(?:designation|libelle|objet)\s*[:\-]\s*([a-z0-9][a-z0-9 '&._-]{1,60}?)(?=\s+(?:total|tva|montant|net)\b|$)/i
  );
  if (labeled?.[1] && !/^(facture|avoir|invoice)\b/i.test(labeled[1])) return titleCase(labeled[1].trim());
  const prefix = creditNote ? "Avoir" : kind === "sale" ? "Vente" : "Achat";
  return number ? `${prefix} ${number}` : prefix;
}

function matchesCompany(name, company) {
  if (!name || !company) return false;
  if (sameParty(name, company.name || "")) return true;
  const ice = String(company.ice || "").replace(/\D/g, "");
  return ice.length >= 10 && compactParty(name).includes(ice);
}

function sameParty(left, right) {
  const a = compactParty(left);
  const b = compactParty(right);
  return a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a));
}

function compactParty(value) {
  return fold(value)
    .replace(/\b(sarlau|sarl|s\.a\.r\.l\.u?|sa|ste|societe)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function titleCase(value) {
  return value.replace(/\p{L}+/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

function describe({ kind, creditNote, number, rate, htCents, ttcCents }) {
  const label = creditNote
    ? kind === "sale"
      ? "Avoir client"
      : "Avoir fournisseur"
    : kind === "sale"
      ? "Vente"
      : "Achat";
  return `${label} · ${number || "sans numéro"} · HT ${formatCents(htCents)} · TVA ${rate} % · TTC ${formatCents(ttcCents)}`;
}

function formatCents(cents) {
  const negative = cents < 0;
  const absolute = Math.abs(cents);
  return `${negative ? "-" : ""}${Math.floor(absolute / 100)},${String(absolute % 100).padStart(2, "0")}`;
}

function formatIsoDate(iso) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function toCents(amount) {
  return Math.round(amount * 100);
}
