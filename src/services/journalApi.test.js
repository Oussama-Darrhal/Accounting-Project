import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  buildJournalPayload,
  fetchDashboardAlerts,
  fetchJournalEntries,
  messageFromApiError,
  normalizeEntry,
  postJournalEntry,
  unwrapEntry,
  unwrapList,
} from "./journalApi.js";

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const originalFetch = globalThis.fetch;

function mockFetch(handler) {
  globalThis.fetch = async (url, options) => handler(String(url), options ?? {});
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(body);
    },
  };
}

describe("journalApi helpers", () => {
  it("builds a numeric payload from typed grid rows", () => {
    const payload = buildJournalPayload([
      {
        date: "2026-01-12",
        journal: "ACH",
        facture: " FF-0342 ",
        libelle: " Achat ",
        compte: "6111",
        tiers: "",
        debit: "12500,00",
        credit: "",
        tva: "20",
      },
      {
        date: "2026-01-12",
        journal: "ACH",
        facture: "FF-0342",
        libelle: "",
        compte: "4411",
        tiers: "4411 - Sud Import",
        debit: "",
        credit: "0",
        tva: "20",
      },
    ]);
    assert.equal(payload.lines.length, 1);
    assert.equal(payload.lines[0].debit, 12500);
    assert.equal(payload.lines[0].facture, "FF-0342");
  });

  it("unwraps both a raw list and a data wrapper", () => {
    assert.deepEqual(unwrapList([{ id: "1" }]), [{ id: "1" }]);
    assert.deepEqual(unwrapList({ data: [{ id: "2" }] }), [{ id: "2" }]);
    assert.deepEqual(unwrapList({}), []);
  });

  it("unwraps a posted entry with or without a data envelope", () => {
    assert.equal(unwrapEntry({ id: "abc", lines: [] }).id, "abc");
    assert.equal(unwrapEntry({ data: { id: "def", lines: [] } }).id, "def");
    assert.throws(() => unwrapEntry({}), /inattendue/);
  });

  it("normalizes decimal strings and the draft flag", () => {
    const entry = normalizeEntry({
      id: "uuid",
      is_draft: 1,
      lines: [{ debit: "10.50", credit: "0.00" }],
    });
    assert.equal(entry.is_draft, true);
    assert.equal(entry.lines[0].debit, 10.5);
    assert.equal(entry.lines[0].credit, 0);
  });

  it("prefers Laravel's message, then the first field error", () => {
    assert.equal(messageFromApiError({ message: "Invalide" }, 422), "Invalide");
    assert.equal(messageFromApiError({ errors: { "lines.0.compte": ["Le compte est obligatoire."] } }, 422), "Le compte est obligatoire.");
    assert.equal(messageFromApiError(null, 500), "Erreur API (500)");
  });
});

describe("journalApi HTTP", () => {
  it("GETs journal entries from /api/journal-entries", async () => {
    mockFetch(async (url) => {
      assert.equal(url, "/api/journal-entries");
      return jsonResponse([{ id: "e1", is_draft: false, lines: [{ debit: "1", credit: "0" }] }]);
    });
    const entries = await fetchJournalEntries();
    assert.equal(entries[0].id, "e1");
    assert.equal(entries[0].lines[0].debit, 1);
  });

  it("POSTs an entry and returns the saved resource", async () => {
    mockFetch(async (url, options) => {
      assert.equal(url, "/api/journal-entries");
      assert.equal(options.method, "POST");
      const body = JSON.parse(options.body);
      assert.equal(body.lines[0].compte, "6111");
      return jsonResponse({ id: "new", is_draft: false, lines: body.lines }, 201);
    });
    const saved = await postJournalEntry({ lines: [{ compte: "6111", debit: 10, credit: 0 }] });
    assert.equal(saved.id, "new");
    assert.equal(saved.is_draft, false);
  });

  it("GETs dashboard alert counts", async () => {
    mockFetch(async (url) => {
      assert.equal(url, "/api/dashboard/alerts");
      return jsonResponse({ drafts: 2, late_invoices: 1, solde_restant: "150.00" });
    });
    const alerts = await fetchDashboardAlerts();
    assert.deepEqual(alerts, { drafts: 2, late_invoices: 1, solde_restant: "150.00" });
  });

  it("surfaces a 422 message from Laravel", async () => {
    mockFetch(async () => jsonResponse({ message: "Compte inconnu [9999]." }, 422));
    await assert.rejects(() => fetchJournalEntries(), /Compte inconnu/);
  });
});
