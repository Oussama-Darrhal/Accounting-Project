export function isPdfFile(file) {
  if (!file) return false;
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name ?? "");
}

export function isImageFile(file) {
  if (!file) return false;
  if (typeof file.type === "string" && file.type.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp)$/i.test(file.name ?? "");
}

export function isInvoiceFile(file) {
  return isPdfFile(file) || isImageFile(file);
}

export function hasUsableInvoiceText(text) {
  const source = String(text ?? "").trim();
  if (source.length < 20) return false;
  const folded = source.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const hasMoney = /\d{1,3}(?:[ \u00a0\u202f]\d{3})*[.,]\d{2}/.test(source);
  const hasLabel = /facture|avoir|invoice|total|tva|montant|hors\s+tax/.test(folded);
  return hasMoney && hasLabel;
}
