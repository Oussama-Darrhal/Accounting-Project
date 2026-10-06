import { actorName, getActiveCompanyId } from "./companyContext.js";
import { toCents } from "../lib/utils.js";

/** Drops blank rows and converts amounts to numbers, the shape POST /api/journal-entries expects. */
function hasAmount(line) {
  return toCents(line.debit) !== 0 || toCents(line.credit) !== 0;
}

export function buildJournalPayload(journalLines) {
  return {
    lines: journalLines.filter(hasAmount).map((line) => ({
      date: line.date,
      journal: line.journal,
      facture: line.facture.trim(),
      libelle: line.libelle.trim(),
      compte: line.compte,
      tiers: line.tiers.trim(),
      debit: toCents(line.debit) / 100,
      credit: toCents(line.credit) / 100,
      tva: Number(line.tva),
    })),
  };
}

export function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export function unwrapEntry(payload) {
  if (payload?.data && typeof payload.data === "object" && !Array.isArray(payload.data) && payload.data.id) {
    return payload.data;
  }
  if (payload?.id) return payload;
  throw new Error("Réponse d'écriture inattendue.");
}

export function normalizeEntry(entry) {
  return {
    ...entry,
    is_draft: Boolean(entry.is_draft),
    savedAt: entry.savedAt ?? null,
    lines: (entry.lines ?? []).map((line) => ({
      ...line,
      debit: Number(line.debit) || 0,
      credit: Number(line.credit) || 0,
    })),
  };
}

export function messageFromApiError(payload, status) {
  if (typeof payload?.message === "string" && payload.message.trim()) return payload.message;
  if (payload?.errors && typeof payload.errors === "object") {
    const first = Object.values(payload.errors).flat()[0];
    if (typeof first === "string" && first.trim()) return first;
  }
  return `Erreur API (${status})`;
}

async function apiFetch(path, options = {}) {
  const companyId = getActiveCompanyId();
  const actor = actorName();
  const response = await fetch(path, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(companyId ? { "X-Company-Id": companyId } : {}),
      ...(actor ? { "X-Actor-Name": actor } : {}),
      ...options.headers,
    },
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new Error(messageFromApiError(payload, response.status));
  }

  return payload;
}

export async function fetchJournalEntries() {
  const payload = await apiFetch("/api/journal-entries");
  return unwrapList(payload).map(normalizeEntry);
}

export async function postJournalEntry(payload) {
  const body = await apiFetch("/api/journal-entries", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeEntry(unwrapEntry(body));
}

export async function putJournalEntry(entryId, payload) {
  const body = await apiFetch(`/api/journal-entries/${entryId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return normalizeEntry(unwrapEntry(body));
}

export async function fetchJournalEntry(entryId) {
  const payload = await apiFetch(`/api/journal-entries/${entryId}`);
  return normalizeEntry(unwrapEntry(payload));
}

export async function fetchDashboardAlerts() {
  const payload = await apiFetch("/api/dashboard/alerts");
  return {
    drafts: Number(payload?.drafts) || 0,
    late_invoices: Number(payload?.late_invoices) || 0,
    unlettered: Number(payload?.unlettered) || 0,
    solde_restant: payload?.solde_restant ?? "0.00",
  };
}

export function normalizeAccount(account) {
  return {
    id: String(account.id),
    code: account.code,
    name: account.name,
    parent_id: account.parent_id == null ? null : String(account.parent_id),
    parent_code: account.parent_code ?? null,
    class: account.class ?? null,
  };
}

export async function fetchAccounts() {
  const payload = await apiFetch("/api/accounts");
  return unwrapList(payload).map(normalizeAccount);
}

export async function createAccount(body) {
  const payload = await apiFetch("/api/accounts", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const account = payload?.data?.id ? payload.data : payload;
  return normalizeAccount(account);
}

export async function postLettrage(lineIds) {
  return apiFetch("/api/lettrage", {
    method: "POST",
    body: JSON.stringify({ line_ids: lineIds }),
  });
}

export async function unmatchLettrage(code) {
  return apiFetch("/api/lettrage/unmatch", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export function normalizeCompany(company) {
  return {
    id: String(company.id),
    slug: company.slug,
    name: company.name,
    umbrella: company.umbrella || "Groupe",
    ice: company.ice ?? "",
    fiscal_id: company.fiscal_id ?? "",
    fiscal_start: company.fiscal_start ?? "",
    fiscal_end: company.fiscal_end ?? "",
    default_tva_rate: String(company.default_tva_rate ?? 20),
    currency: company.currency || "MAD",
  };
}

export async function fetchCompanies() {
  const payload = await apiFetch("/api/companies");
  return unwrapList(payload).map(normalizeCompany);
}

export async function selectCompany(companyId) {
  const payload = await apiFetch(`/api/companies/${companyId}/select`, { method: "POST" });
  return normalizeCompany(unwrapEntry(payload));
}

export async function updateCompany(companyId, body) {
  const payload = await apiFetch(`/api/companies/${companyId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return normalizeCompany(unwrapEntry(payload));
}

export async function fetchActivityLogs() {
  const payload = await apiFetch("/api/activity-logs");
  return unwrapList(payload).map((row) => ({
    id: row.id,
    action: row.action,
    message: row.message,
    actor: row.actor || "",
    meta: row.meta ?? null,
    createdAt: row.createdAt ?? row.created_at ?? null,
  }));
}

/** @deprecated use postJournalEntry — kept so older imports still hit the API. */
export const saveJournalEntry = postJournalEntry;
