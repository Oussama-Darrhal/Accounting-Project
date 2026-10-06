import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dashboardAlertsFromApi, draftLabel, lateInvoiceLabel } from "./alerts.js";

describe("dashboard alerts from the API", () => {
  it("labels zero, one, and many drafts", () => {
    assert.equal(draftLabel(0), "Aucun brouillon à corriger");
    assert.equal(draftLabel(1), "1 Brouillon à corriger");
    assert.equal(draftLabel(3), "3 Brouillons à corriger");
  });

  it("labels late invoices and keeps the TVA reminder", () => {
    const alerts = dashboardAlertsFromApi({ drafts: 0, late_invoices: 2, solde_restant: "1500.00" });
    assert.equal(alerts[0].label, "Aucun brouillon à corriger");
    assert.equal(alerts[1].label, lateInvoiceLabel(2));
    assert.match(alerts[1].detail, /1500\.00/);
    assert.equal(alerts[2].id, "vat-declaration");
  });
});
