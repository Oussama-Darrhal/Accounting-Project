/** Hardcoded for now; shape is what the alerts API should return. */
export const ACCOUNTING_ALERTS = [
  {
    id: "drafts",
    label: "3 Brouillons à corriger",
    detail: "Écritures en attente de vérification",
    tone: "warning",
    to: "/saisie",
  },
  {
    id: "late-invoices",
    label: "2 Factures > 60 jours (Loi 69-21)",
    detail: "Relances et lettrage à effectuer",
    tone: "destructive",
    to: "/lettrage",
  },
  {
    id: "vat-declaration",
    label: "Déclaration TVA — échéance 20/10",
    detail: "Préparez votre prochaine déclaration",
    tone: "warning",
    to: "/grand-livre",
  },
];
