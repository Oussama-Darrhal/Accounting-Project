const SMALL = {
  zero: 0,
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  onze: 11,
  douze: 12,
  treize: 13,
  quatorze: 14,
  quinze: 15,
  seize: 16,
  vingt: 20,
  vingts: 20,
  trente: 30,
  quarante: 40,
  cinquante: 50,
  soixante: 60,
  soixantedix: 70,
  quatrevingts: 80,
  quatrevingtdix: 90,
};

function fold(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function normalizeTokens(phrase) {
  return fold(phrase)
    .replace(/quatre[\s-]+vingt[\s-]+dix/g, "quatrevingtdix")
    .replace(/quatre[\s-]+vingts?/g, "quatrevingts")
    .replace(/soixante[\s-]+dix/g, "soixantedix")
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter((token) => token && token !== "et");
}

/** Parses "dix-neuf mille cent cinquante" into 19150. */
export function parseFrenchIntegerWords(phrase) {
  const tokens = normalizeTokens(phrase);
  if (!tokens.length) return null;
  let total = 0;
  let current = 0;
  let used = 0;
  for (const token of tokens) {
    if (token === "cent" || token === "cents") {
      current = (current || 1) * 100;
      used += 1;
      continue;
    }
    if (token === "mille") {
      total += (current || 1) * 1000;
      current = 0;
      used += 1;
      continue;
    }
    if (token === "million" || token === "millions") {
      total += (current || 1) * 1_000_000;
      current = 0;
      used += 1;
      continue;
    }
    if (SMALL[token] == null) continue;
    current += SMALL[token];
    used += 1;
  }
  const value = total + current;
  return used > 0 && value > 0 ? value : null;
}

/** Reads "Arrêtée ... à la somme de : dix-neuf mille cent cinquante dirhams". */
export function parseFrenchAmountWords(text) {
  const folded = fold(text).replace(/\s+/g, " ");
  const patterns = [
    /(?:arrete\w*|arreter)\s+(?:la presente facture\s+)?a la somme de\s*[:.]?\s*([a-z\s-]+?)\s*(?:dirhams?|dhs?|mad)\b/,
    /a la somme de\s*[:.]?\s*([a-z\s-]+?)\s*(?:dirhams?|dhs?|mad)\b/,
    /somme de\s*[:.]?\s*([a-z\s-]+?)\s*(?:dirhams?|dhs?|mad)\b/,
  ];
  for (const pattern of patterns) {
    const match = folded.match(pattern);
    if (!match) continue;
    const dirhams = parseFrenchIntegerWords(match[1]);
    if (dirhams != null) return dirhams;
  }
  return null;
}
