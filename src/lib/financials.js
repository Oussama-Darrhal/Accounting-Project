import { addDays, daysBetween, formatShortDate, parseISODate } from "./dateRange.js";

const TVA_RATE = 0.2;
/** Share of charges carrying deductible VAT (salaries, social charges, etc. do not). */
const DEDUCTIBLE_SHARE = 0.75;

export function filterByRange(series, { startDate, endDate }) {
  return series.filter((day) => day.date >= startDate && day.date <= endDate);
}

export function summarize(days) {
  const totals = days.reduce(
    (acc, day) => {
      acc.revenue += day.revenue;
      acc.charges += day.charges;
      acc.invoices += day.invoices;
      return acc;
    },
    { revenue: 0, charges: 0, invoices: 0 }
  );
  const vatCollected = totals.revenue * TVA_RATE;
  const vatDeductible = totals.charges * TVA_RATE * DEDUCTIBLE_SHARE;
  return {
    ...totals,
    netResult: totals.revenue - totals.charges,
    vatDue: Math.max(0, vatCollected - vatDeductible),
  };
}

/** Percentage change, or null when there is no baseline to compare against. */
export function percentChange(current, previous) {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

export function getGranularity({ startDate, endDate }) {
  const span = daysBetween(startDate, endDate) + 1;
  if (span <= 31) return "day";
  if (span <= 92) return "week";
  return "month";
}

export const GRANULARITY_LABELS = { day: "Date", week: "Semaine", month: "Mois" };

const monthFormatter = new Intl.DateTimeFormat("fr-FR", { month: "short" });

function bucketLabels(key, granularity, multiYear) {
  if (granularity === "month") {
    const [year, month] = key.split("-");
    const name = monthFormatter.format(parseISODate(`${key}-01`));
    return { label: multiYear ? `${name} ${year.slice(2)}` : name, exportLabel: `${month}/${year}` };
  }
  const short = formatShortDate(key).slice(0, 5);
  return {
    label: short,
    exportLabel: granularity === "week" ? `Semaine du ${formatShortDate(key)}` : formatShortDate(key),
  };
}

/**
 * Groups daily rows into day / week / month buckets depending on the range length.
 * Every bucket in the range is emitted, so periods without activity show as zero.
 */
export function bucketize(days, range) {
  const granularity = getGranularity(range);
  const multiYear = range.startDate.slice(0, 4) !== range.endDate.slice(0, 4);
  const keyOf = (iso) => {
    if (granularity === "day") return iso;
    if (granularity === "week") {
      return addDays(range.startDate, Math.floor(daysBetween(range.startDate, iso) / 7) * 7);
    }
    return iso.slice(0, 7);
  };

  const buckets = new Map();
  for (let iso = range.startDate; iso <= range.endDate; iso = addDays(iso, 1)) {
    const key = keyOf(iso);
    if (!buckets.has(key)) {
      buckets.set(key, { key, ...bucketLabels(key, granularity, multiYear), revenue: 0, charges: 0 });
    }
  }
  for (const day of days) {
    const bucket = buckets.get(keyOf(day.date));
    if (bucket) {
      bucket.revenue += day.revenue;
      bucket.charges += day.charges;
    }
  }

  return { granularity, buckets: [...buckets.values()] };
}

/** Posted class 7 = CA HT, class 6 = charges. Drafts stay out. */
export function dailyFinancialsFromJournal(journalEntries) {
  const byDate = new Map();
  for (const entry of journalEntries ?? []) {
    if (!entry || entry.is_draft) continue;
    for (const line of entry.lines ?? []) {
      const date = line.date || entry.date_piece;
      if (!date) continue;
      const code = String(line.compte || "");
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      const day = byDate.get(date) ?? { date, revenue: 0, charges: 0, invoices: 0 };
      if (code.startsWith("7")) {
        day.revenue += credit - debit;
        if (credit > 0) day.invoices += 1;
      } else if (code.startsWith("6")) {
        day.charges += debit - credit;
      }
      byDate.set(date, day);
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
