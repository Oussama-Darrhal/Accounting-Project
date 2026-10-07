import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasUsableInvoiceText, isImageFile, isInvoiceFile, isPdfFile } from "./invoiceFiles.js";

describe("invoice file helpers", () => {
  it("accepts PDF and common image types", () => {
    assert.equal(isPdfFile({ name: "Facture_16_2026.pdf", type: "application/pdf" }), true);
    assert.equal(isImageFile({ name: "facture.png", type: "image/png" }), true);
    assert.equal(isImageFile({ name: "scan.JPG", type: "" }), true);
    assert.equal(isInvoiceFile({ name: "note.txt", type: "text/plain" }), false);
  });

  it("requires both an amount and an invoice label", () => {
    assert.equal(hasUsableInvoiceText("Total HT 1 400,00 TVA 20 %"), true);
    assert.equal(hasUsableInvoiceText("photo floue"), false);
    assert.equal(hasUsableInvoiceText(""), false);
  });
});
