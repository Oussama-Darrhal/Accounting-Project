const LINE_TOLERANCE = 4;

/** Rebuilds reading order from PDF.js text items, one visual line at a time. */
export function itemsToText(items) {
  const positioned = items
    .filter((item) => item.str && String(item.str).trim())
    .map((item) => ({
      str: String(item.str).trim(),
      x: item.transform?.[4] ?? item.x ?? 0,
      y: item.transform?.[5] ?? item.y ?? 0,
    }))
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const lines = [];
  let current = [];
  let currentY = null;
  for (const item of positioned) {
    if (currentY != null && Math.abs(item.y - currentY) > LINE_TOLERANCE) {
      lines.push(joinLine(current));
      current = [];
      currentY = item.y;
    } else if (currentY == null) {
      currentY = item.y;
    }
    current.push(item);
  }
  if (current.length) lines.push(joinLine(current));
  return lines.join("\n");
}

function joinLine(items) {
  return items
    .slice()
    .sort((a, b) => a.x - b.x)
    .map((item) => item.str)
    .join(" ");
}
