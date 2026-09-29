import { toCents } from "@/lib/utils";

export const DRAFT_STORAGE_KEY = "saisie_comptable_draft";
export const DRAFTS_STORAGE_KEY = "saisie_comptable_drafts";
export const ACTIVE_DRAFT_ID_KEY = "saisie_comptable_active_draft_id";

const LINE_FIELDS = ["date", "facture", "compte", "debit", "credit", "tva"];

export function createDraftId() {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function hasContent(line) {
  return Boolean(
    line?.date || String(line?.facture ?? "").trim() || line?.compte || String(line?.debit ?? "").trim() || String(line?.credit ?? "").trim()
  );
}

function normalizeLines(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((line) => line && typeof line.id === "string")
    .map((line) => {
      const next = { id: line.id, date: "", facture: "", compte: "", debit: "", credit: "", tva: "20" };
      LINE_FIELDS.forEach((field) => typeof line[field] === "string" && (next[field] = line[field]));
      return next;
    });
}

function readCollection() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DRAFTS_STORAGE_KEY));
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((draft) => draft && typeof draft.id === "string")
      .map((draft) => ({
        id: draft.id,
        createdAt: typeof draft.createdAt === "string" ? draft.createdAt : new Date().toISOString(),
        updatedAt: typeof draft.updatedAt === "string" ? draft.updatedAt : draft.createdAt,
        lines: normalizeLines(draft.lines),
      }));
  } catch {
    return null;
  }
}

function writeCollection(drafts) {
  localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
}

function readLegacyLines() {
  try {
    return normalizeLines(JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)));
  } catch {
    return [];
  }
}

function seedDrafts() {
  return [
    {
      id: "draft-seed-1",
      createdAt: "2026-09-12T09:14:00.000Z",
      updatedAt: "2026-09-12T09:18:00.000Z",
      lines: [
        { id: "seed-1-a", date: "2026-09-12", facture: "FA-2026-088", compte: "3421", debit: "4 800,00", credit: "", tva: "20" },
        { id: "seed-1-b", date: "2026-09-12", facture: "FA-2026-088", compte: "7111", debit: "", credit: "4 000,00", tva: "20" },
      ],
    },
    {
      id: "draft-seed-2",
      createdAt: "2026-09-18T11:02:00.000Z",
      updatedAt: "2026-09-18T11:40:00.000Z",
      lines: [
        { id: "seed-2-a", date: "2026-09-18", facture: "FA-2026-102", compte: "6111", debit: "1 200,00", credit: "", tva: "20" },
        { id: "seed-2-b", date: "2026-09-18", facture: "FA-2026-102", compte: "3455", debit: "240,00", credit: "", tva: "20" },
        { id: "seed-2-c", date: "2026-09-18", facture: "FA-2026-102", compte: "4411", debit: "", credit: "1 200,00", tva: "20" },
      ],
    },
    {
      id: "draft-seed-3",
      createdAt: "2026-09-24T16:30:00.000Z",
      updatedAt: "2026-09-24T16:33:00.000Z",
      lines: [
        { id: "seed-3-a", date: "2026-09-24", facture: "FA-2026-115", compte: "6131", debit: "3 500,00", credit: "", tva: "10" },
        { id: "seed-3-b", date: "2026-09-24", facture: "FA-2026-115", compte: "4411", debit: "", credit: "3 500,00", tva: "10" },
      ],
    },
  ];
}

export function ensureDraftsInitialized() {
  if (readCollection() !== null) return;
  const legacy = readLegacyLines();
  const seeds = seedDrafts();
  if (legacy.some(hasContent)) {
    const migratedId = createDraftId();
    writeCollection([
      {
        id: migratedId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lines: legacy,
      },
      ...seeds.slice(0, 2),
    ]);
    setActiveDraftId(migratedId);
  } else {
    writeCollection(seeds);
  }
}

export function getActiveDraftId() {
  return localStorage.getItem(ACTIVE_DRAFT_ID_KEY);
}

export function setActiveDraftId(id) {
  localStorage.setItem(ACTIVE_DRAFT_ID_KEY, id);
}

export function getDraft(id) {
  return (readCollection() ?? []).find((draft) => draft.id === id) ?? null;
}

export function listDrafts() {
  ensureDraftsInitialized();
  return (readCollection() ?? [])
    .filter((draft) => draft.lines.some(hasContent))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export function upsertDraft({ id, lines }) {
  const now = new Date().toISOString();
  const drafts = readCollection() ?? [];
  const index = drafts.findIndex((draft) => draft.id === id);
  const record = {
    id,
    createdAt: index === -1 ? now : drafts[index].createdAt,
    updatedAt: now,
    lines: normalizeLines(lines),
  };
  if (index === -1) drafts.unshift(record);
  else drafts[index] = record;
  writeCollection(drafts);
}

export function removeDraft(id) {
  writeCollection((readCollection() ?? []).filter((draft) => draft.id !== id));
}

export function resumeDraft(id) {
  const draft = getDraft(id);
  if (!draft) return false;
  setActiveDraftId(id);
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft.lines));
  return true;
}

export function summarizeDraft(draft) {
  const debit = draft.lines.reduce((sum, line) => sum + toCents(line.debit), 0);
  const credit = draft.lines.reduce((sum, line) => sum + toCents(line.credit), 0);
  const facture = draft.lines.find((line) => String(line.facture).trim())?.facture.trim() ?? "—";
  return {
    facture,
    amount: Math.max(debit, credit) / 100,
    isBalanced: debit === credit,
  };
}
