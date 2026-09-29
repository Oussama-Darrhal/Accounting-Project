import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ACTIVE_DRAFT_ID_KEY,
  DRAFT_STORAGE_KEY,
  createDraftId,
  ensureDraftsInitialized,
  getActiveDraftId,
  getDraft,
  removeDraft,
  setActiveDraftId,
  upsertDraft,
} from "@/lib/drafts";
import { toCents } from "@/lib/utils";

export { DRAFT_STORAGE_KEY };

let lineSequence = 0;

/** Date.now() alone collides when two lines are created in the same millisecond. */
const createLineId = () => `line-${Date.now()}-${(lineSequence += 1)}`;

/** Amounts stay strings while typing ("12," is a valid intermediate state); they become numbers in the payload. */
export function createEmptyLine() {
  return { id: createLineId(), date: "", facture: "", compte: "", debit: "", credit: "", tva: "20" };
}

export const hasAmount = (line) => toCents(line.debit) !== 0 || toCents(line.credit) !== 0;

export const isLineBlank = (line) =>
  !line.date && !line.facture.trim() && !line.compte && !line.debit.trim() && !line.credit.trim();

function readActiveLines() {
  ensureDraftsInitialized();
  const activeId = getActiveDraftId();
  const fromCollection = activeId ? getDraft(activeId) : null;
  if (fromCollection?.lines?.length) return { id: activeId, lines: fromCollection.lines };

  try {
    const parsed = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY));
    if (Array.isArray(parsed) && parsed.length > 0) {
      const fields = ["date", "facture", "compte", "debit", "credit", "tva"];
      const lines = parsed
        .filter((line) => line && typeof line.id === "string")
        .map((line) => {
          const restored = { ...createEmptyLine(), id: line.id };
          fields.forEach((field) => typeof line[field] === "string" && (restored[field] = line[field]));
          return restored;
        });
      if (lines.length) return { id: activeId ?? createDraftId(), lines };
    }
  } catch {
    /* ignore a corrupted live key */
  }

  return { id: activeId ?? createDraftId(), lines: [createEmptyLine()] };
}

export function useJournalLines() {
  const [session] = useState(() => {
    const loaded = readActiveLines();
    setActiveDraftId(loaded.id);
    return loaded;
  });
  const [draftId, setDraftId] = useState(session.id);
  const [journalLines, setJournalLines] = useState(session.lines);

  useEffect(() => {
    localStorage.setItem(ACTIVE_DRAFT_ID_KEY, draftId);
    if (journalLines.every(isLineBlank)) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      removeDraft(draftId);
    } else {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(journalLines));
      upsertDraft({ id: draftId, lines: journalLines });
    }
  }, [draftId, journalLines]);

  const updateLine = useCallback((id, field, value) => {
    setJournalLines((current) => current.map((line) => (line.id === id ? { ...line, [field]: value } : line)));
  }, []);

  const addLine = useCallback(() => {
    setJournalLines((current) => [...current, createEmptyLine()]);
  }, []);

  const removeLine = useCallback((id) => {
    setJournalLines((current) => (current.length > 1 ? current.filter((line) => line.id !== id) : current));
  }, []);

  const reset = useCallback(() => {
    removeDraft(draftId);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    const nextId = createDraftId();
    setActiveDraftId(nextId);
    setDraftId(nextId);
    setJournalLines([createEmptyLine()]);
  }, [draftId]);

  const totals = useMemo(() => {
    const debit = journalLines.reduce((sum, line) => sum + toCents(line.debit), 0);
    const credit = journalLines.reduce((sum, line) => sum + toCents(line.credit), 0);
    return {
      debit: debit / 100,
      credit: credit / 100,
      difference: (debit - credit) / 100,
      isBalanced: debit === credit,
      isEmpty: debit === 0 && credit === 0,
    };
  }, [journalLines]);

  return { journalLines, totals, updateLine, addLine, removeLine, reset };
}
