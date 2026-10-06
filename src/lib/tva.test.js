import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  amountRole,
  applyLineChange,
  formatAmountInput,
  formatCents,
  htFromTtcCents,
  hydrateLineAmounts,
  syncInvoiceTax,
  ttcFromHtCents,
  tvaFromHtCents,
} from "./tva.js";

describe("TVA cents math", () => {
  it("builds TTC from HT at 20 % without floats", () => {
    assert.equal(tvaFromHtCents(1_250_000, 20), 250_000);
    assert.equal(ttcFromHtCents(1_250_000, 20), 1_500_000);
    assert.equal(htFromTtcCents(1_500_000, 20), 1_250_000);
  });

  it("keeps HT = TTC when the rate is 0 %", () => {
    assert.equal(ttcFromHtCents(10_000, 0), 10_000);
    assert.equal(htFromTtcCents(10_000, 0), 10_000);
    assert.equal(tvaFromHtCents(10_000, 0), 0);
  });

  it("formats grid amounts in French", () => {
    assert.equal(formatCents(1_250_000), "12500,00");
    assert.equal(formatAmountInput(0), "");
    assert.equal(formatAmountInput(250_000), "2500,00");
  });
});

describe("amountRole", () => {
  it("posts HT on classes 6/7, tax on 3455/4455, TTC otherwise", () => {
    assert.equal(amountRole("6111"), "ht");
    assert.equal(amountRole("7121"), "ht");
    assert.equal(amountRole("3455"), "vat");
    assert.equal(amountRole("44550001"), "vat");
    assert.equal(amountRole("4411"), "ttc");
    assert.equal(amountRole("3421"), "ttc");
  });
});

describe("applyLineChange", () => {
  const charge = {
    id: "1",
    compte: "6111",
    facture: "FF-1",
    debit: "",
    credit: "",
    ht: "",
    ttc: "",
    tva: "20",
  };

  it("fills TTC and débit HT when the intern types HT on a charge", () => {
    const next = applyLineChange(charge, "ht", "12500,00");
    assert.equal(next.ttc, "15000,00");
    assert.equal(next.debit, "12500,00");
    assert.equal(next.credit, "");
  });

  it("fills HT from TTC on a fournisseur (posted amount = TTC)", () => {
    const next = applyLineChange({ ...charge, compte: "4411" }, "ttc", "15000");
    assert.equal(next.ht, "12500,00");
    assert.equal(next.credit, "15000,00");
    assert.equal(next.debit, "");
  });

  it("keeps TTC and rebuilds HT when the TVA rate changes", () => {
    const priced = applyLineChange(charge, "ttc", "1200,00");
    const reduced = applyLineChange(priced, "tva", "10");
    assert.equal(reduced.ttc, "1200,00");
    assert.equal(reduced.ht, "1090,91");
    assert.equal(reduced.tva, "10");
    assert.equal(reduced.debit, "1090,91");
  });

  it("posts the tax amount on 3455", () => {
    const vatLine = applyLineChange({ ...charge, compte: "3455" }, "ht", "12500,00");
    assert.equal(vatLine.ttc, "15000,00");
    assert.equal(vatLine.debit, "2500,00");
  });

  it("rebuilds HT/TTC from a débit on a charge account", () => {
    const next = applyLineChange(charge, "debit", "100,00");
    assert.equal(next.ht, "100,00");
    assert.equal(next.ttc, "120,00");
    assert.equal(next.credit, "");
  });

  it("does not stamp débit until a compte is chosen", () => {
    const next = applyLineChange({ ...charge, compte: "" }, "ht", "100,00");
    assert.equal(next.ttc, "120,00");
    assert.equal(next.debit, "");
    const posted = applyLineChange(next, "compte", "6111");
    assert.equal(posted.debit, "100,00");
  });
});

describe("syncInvoiceTax", () => {
  it("mirrors HT/TTC/TVA onto the other rows of the same facture", () => {
    const lines = [
      { id: "a", facture: "FF-1", compte: "6111", debit: "12500,00", credit: "", ht: "12500,00", ttc: "15000,00", tva: "20" },
      { id: "b", facture: "FF-1", compte: "3455", debit: "2500,00", credit: "", ht: "12500,00", ttc: "15000,00", tva: "20" },
      { id: "c", facture: "FF-1", compte: "4411", debit: "", credit: "15000,00", ht: "12500,00", ttc: "15000,00", tva: "20" },
      { id: "d", facture: "OTHER", compte: "6111", debit: "10,00", credit: "", ht: "10,00", ttc: "12,00", tva: "20" },
    ];
    const next = syncInvoiceTax(lines, "c", "tva", "10");
    assert.equal(next[0].tva, "10");
    assert.equal(next[0].ht, "13636,36");
    assert.equal(next[0].debit, "13636,36");
    assert.equal(next[1].debit, "1363,64");
    assert.equal(next[2].credit, "15000,00");
    assert.equal(next[2].ht, "13636,36");
    assert.equal(next[3].tva, "20");
    assert.equal(next[3].debit, "10,00");
  });
});

describe("hydrateLineAmounts", () => {
  it("prefers base_ht + montant_tva from the API", () => {
    const amounts = hydrateLineAmounts({ base_ht: "12500.00", montant_tva: "2500.00", tva: 20, compte: "6111" });
    assert.equal(amounts.ht, "12500,00");
    assert.equal(amounts.ttc, "15000,00");
  });

  it("derives HT/TTC from a posted charge line when the API omitted them", () => {
    const amounts = hydrateLineAmounts({ debit: 100, credit: 0, tva: 20, compte: "6111" });
    assert.equal(amounts.ht, "100,00");
    assert.equal(amounts.ttc, "120,00");
  });
});
