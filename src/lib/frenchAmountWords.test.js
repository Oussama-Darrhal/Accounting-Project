import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseFrenchAmountWords, parseFrenchIntegerWords } from "./frenchAmountWords.js";

describe("parseFrenchIntegerWords", () => {
  it("reads Gettravel and CBF closing amounts", () => {
    assert.equal(parseFrenchIntegerWords("Dix-neuf mille cent cinquante"), 19150);
    assert.equal(parseFrenchIntegerWords("Mille Six Cent Quatre-Vingts"), 1680);
    assert.equal(parseFrenchIntegerWords("douze mille cinq cents"), 12500);
  });
});

describe("parseFrenchAmountWords", () => {
  it("reads the legal closing sentence", () => {
    assert.equal(
      parseFrenchAmountWords(
        "Arrêté la présente facture à la somme de : Dix-neuf mille cent cinquante dirhams. 00 centimes."
      ),
      19150
    );
    assert.equal(
      parseFrenchAmountWords("Arrêter la présente facture à la somme de : Mille Six Cent Quatre-Vingts Dirhams"),
      1680
    );
    assert.equal(
      parseFrenchAmountWords("à la somme de : Dix-neuf mille cent cinquante dirhams. 00 centimes."),
      19150
    );
  });
});
