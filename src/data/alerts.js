export const VAT_ALERT = {
  id: "vat-declaration",
  label: "Déclaration TVA — échéance 20/10",
  detail: "Préparez votre prochaine déclaration",
  tone: "warning",
  to: "/grand-livre",
};

export function draftLabel(count) {
  if (count === 0) return "Aucun brouillon à corriger";
  if (count === 1) return "1 Brouillon à corriger";
  return `${count} Brouillons à corriger`;
}

export function lateInvoiceLabel(count) {
  if (count === 0) return "Aucune facture hors délai (Loi 69-21)";
  if (count === 1) return "1 Facture > 60 jours (Loi 69-21)";
  return `${count} Factures > 60 jours (Loi 69-21)`;
}

/** Maps GET /api/dashboard/alerts onto the dashboard cards. TVA stays a static reminder. */
export function dashboardAlertsFromApi(data = {}) {
  const drafts = Number(data.drafts) || 0;
  const late = Number(data.late_invoices) || 0;
  const solde = data.solde_restant;

  return [
    {
      id: "drafts",
      label: draftLabel(drafts),
      detail: drafts ? "Écritures en attente de vérification" : "Aucune écriture déséquilibrée enregistrée",
      tone: "warning",
      to: "/saisie",
    },
    {
      id: "late-invoices",
      label: lateInvoiceLabel(late),
      detail: late
        ? solde
          ? `Relances et lettrage à effectuer · solde ${solde} MAD`
          : "Relances et lettrage à effectuer"
        : "Aucune facture hors délai 69-21",
      tone: "destructive",
      to: "/lettrage",
    },
    VAT_ALERT,
  ];
}
