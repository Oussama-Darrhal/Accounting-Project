/** Hardcoded for now; shape is what the alerts API should return. */
export const ACCOUNTING_ALERTS = [
  {
    id: "drafts",
    emoji: "⚠️",
    label: "3 Brouillons à corriger",
    tone: "warning",
    to: "/brouillons",
  },
  {
    id: "late-invoices",
    emoji: "🚨",
    label: "2 Factures > 60 jours (Loi 69-21)",
    tone: "destructive",
    to: "/lettrage",
  },
];
