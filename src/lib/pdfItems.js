/** Rebuilds reading order from PDF.js text items, one visual line at a time. */
export function itemsToText(items) {
  const positioned = items
    .filter((item) => item.str && item.str.trim())
    .map((item) => ({
      str: item.str.trim(),
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
    }))
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const lines = [];
  let current = [];
  let currentY = null;
  for (const item of positioned) {
    if (currentY != null && Math.abs(item.y - currentY) > 3) {
      lines.push(current.join(" "));
      current = [];
    }
    currentY = item.y;
    current.push(item.str);
  }
  if (current.length) lines.push(current.join(" "));
  return lines.join("\n");
}
