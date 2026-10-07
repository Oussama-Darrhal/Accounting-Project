import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { itemsToText } from "./pdfItems.js";

function item(str, x, y) {
  return { str, transform: [1, 0, 0, 1, x, y] };
}

describe("itemsToText", () => {
  it("reads amounts that sit slightly above their labels from left to right", () => {
    const text = itemsToText([
      item("Casablanca le : 03 Août 2026", 72.96, 679.18),
      item("Société :", 323.23, 679.18),
      item("JONY TRAVEL", 369.91, 679.66),
      item("Base HT :", 360.43, 230.33),
      item("1400,00", 493.66, 230.93),
      item("TVA 20 % :", 360.91, 212.21),
      item("280,00", 497.5, 212.81),
      item("Montant total TTC :", 318.53, 193.97),
      item("1680,00", 493.66, 194.57),
    ]);

    assert.match(text, /Casablanca le : 03 Août 2026 Société : JONY TRAVEL/);
    assert.match(text, /Base HT : 1400,00/);
    assert.match(text, /TVA 20 % : 280,00/);
    assert.match(text, /Montant total TTC : 1680,00/);
    assert.doesNotMatch(text, /1400,00 Base HT/);
  });
});
