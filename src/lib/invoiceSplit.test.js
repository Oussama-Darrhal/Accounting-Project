import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeInvoiceSplit } from "./invoiceSplit.js";

describe("describeInvoiceSplit", () => {
  it("reads HT, TVA and TTC from a Gettravel-style purchase triplet", () => {
    const recap = describeInvoiceSplit([
      { compte: "6125", facture: "13", ht: "17409,09", ttc: "19150,00", tva: "10", debit: "17409,09", credit: "", libelle: "Service Transfers · HT" },
      { compte: "3455", facture: "13", ht: "17409,09", ttc: "19150,00", tva: "10", debit: "1740,91", credit: "", libelle: "TVA 10 % · 13" },
      { compte: "4411", facture: "13", ht: "17409,09", ttc: "19150,00", tva: "10", debit: "", credit: "19150,00", tiers: "4411 - Gettravel&Tours Sarlau", libelle: "Fournisseur · TTC" },
    ]);
    assert.equal(recap.kind, "purchase");
    assert.equal(recap.htCents, 1740909);
    assert.equal(recap.tvaCents, 174091);
    assert.equal(recap.ttcCents, 1915000);
    assert.equal(recap.rate, "10");
    assert.equal(recap.supplier, "Gettravel&Tours Sarlau");
  });
});
