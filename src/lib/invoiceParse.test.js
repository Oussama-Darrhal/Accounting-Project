import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAmount, parseInvoiceText } from "./invoiceParse.js";
import { toCents } from "./utils.js";

function balanced(result) {
  const debit = result.lines.reduce((sum, line) => sum + toCents(line.debit), 0);
  const credit = result.lines.reduce((sum, line) => sum + toCents(line.credit), 0);
  assert.equal(debit, credit);
  assert.ok(debit > 0);
}

describe("parseAmount", () => {
  it("reads French, Moroccan and US amounts", () => {
    assert.equal(parseAmount("12 500,00"), 12500);
    assert.equal(parseAmount("12.500,00"), 12500);
    assert.equal(parseAmount("1,250.00"), 1250);
    assert.equal(parseAmount("2500,50"), 2500.5);
    assert.equal(parseAmount("10.50"), 10.5);
  });
});

describe("parseInvoiceText", () => {
  it("fills a supplier invoice as a balanced purchase", () => {
    const result = parseInvoiceText(`
      FACTURE FOURNISSEUR
      Facture N° FF-0342
      Date de facture : 12/01/2026
      Fournisseur : Sud Import
      Total HT 12 500,00 MAD
      TVA 20 % 2 500,00
      Total TTC 15 000,00 MAD
    `);

    assert.equal(result.ok, true);
    assert.equal(result.kind, "purchase");
    assert.equal(result.number, "FF-0342");
    assert.equal(result.date, "2026-01-12");
    assert.equal(result.rate, 20);
    assert.deepEqual(result.warnings, []);
    assert.deepEqual(
      result.lines.map((line) => [line.journal, line.libelle, line.compte, line.tiers, line.debit, line.credit]),
      [
        ["ACH", "Achat FF-0342", "6111", "", "12500,00", ""],
        ["ACH", "Achat FF-0342", "3455", "", "2500,00", ""],
        ["ACH", "Achat FF-0342", "4411", "4411 - Sud Import", "", "15000,00"],
      ]
    );
    balanced(result);
  });

  it("fills a sales invoice for services on the income account", () => {
    const result = parseInvoiceText(`
      Facture de vente N° FA-2026-002
      Date de facture : 03/02/2026
      Client : Rif Distribution
      Prestation de conseil
      Montant HT : 10 000,00
      TVA 14 % : 1 400,00
      Net à payer : 11 400,00
    `);

    assert.equal(result.ok, true);
    assert.equal(result.kind, "sale");
    assert.equal(result.rate, 14);
    assert.equal(result.lines[0].journal, "VT");
    assert.equal(result.lines[0].libelle, "Vente FA-2026-002");
    assert.equal(result.lines[0].tiers, "3421 - Rif Distribution");
    assert.equal(result.lines[0].compte, "3421");
    assert.equal(result.lines[0].debit, "11400,00");
    assert.equal(result.lines[1].compte, "7121");
    assert.equal(result.lines[1].tiers, "");
    assert.equal(result.lines[1].credit, "10000,00");
    assert.equal(result.lines[2].compte, "4455");
    balanced(result);
  });

  it("computes HT and VAT from the total and the rate", () => {
    const result = parseInvoiceText(`
      Facture fournisseur N° FF-9
      Date : 01/06/2026
      Total TTC 1 200,00
      TVA 20 %
    `);

    assert.equal(result.ok, true);
    assert.equal(result.htCents, 100000);
    assert.equal(result.tvaCents, 20000);
    assert.equal(result.ttcCents, 120000);
    balanced(result);
  });

  it("reverses an avoir fournisseur", () => {
    const result = parseInvoiceText(`
      Avoir fournisseur N° AV-9
      Date facture : 01/01/2026
      Total HT 1 000,00
      Total TVA 200,00
      Total TTC 1 200,00
    `);

    assert.equal(result.ok, true);
    assert.equal(result.creditNote, true);
    assert.equal(result.lines[0].compte, "6111");
    assert.equal(result.lines[0].credit, "1000,00");
    assert.equal(result.lines.at(-1).compte, "4411");
    assert.equal(result.lines.at(-1).debit, "1200,00");
    balanced(result);
  });

  it("derives a 10 % rate from the amounts", () => {
    const result = parseInvoiceText(`
      Facture fournisseur N° FF-10
      Date de facture : 2026-04-02
      Total HT 100,00
      Total TVA 10,00
      Total TTC 110,00
    `);

    assert.equal(result.ok, true);
    assert.equal(result.rate, 10);
    assert.equal(result.date, "2026-04-02");
    balanced(result);
  });

  it("reads European thousand separators", () => {
    const result = parseInvoiceText(`
      Fournisseur
      Facture N° FF-77
      Date de facture : 15/03/2026
      Total H.T. : 2.500,50
      Total T.T.C. : 3.000,60
    `);

    assert.equal(result.ok, true);
    assert.equal(result.htCents, 250050);
    assert.equal(result.ttcCents, 300060);
    assert.equal(result.rate, 20);
    balanced(result);
  });

  it("asks for manual entry when no amount is present", () => {
    const result = parseInvoiceText("Facture sans montants. Fournisseur Atlas.");
    assert.equal(result.ok, false);
  });

  it("asks for manual entry when the PDF has no text", () => {
    const result = parseInvoiceText("   ");
    assert.equal(result.ok, false);
  });
});
