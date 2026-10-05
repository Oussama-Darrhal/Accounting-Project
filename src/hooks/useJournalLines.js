import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toCents } from "@/lib/utils";
import { useAccountingStore } from "@/stores/useAccountingStore";

export const DRAFT_STORAGE_KEY = "saisie_comptable_draft";

let lineSequence = 0;

/** Date.now() alone collides when two lines are created in the same millisecond. */
const createLineId = () => `line-${Date.now()}-${(lineSequence += 1)}`;

/** Amounts stay strings while typing ("12," is a valid intermediate state); they become numbers in the payload. */
export function createEmptyLine() {
  return {
    id: createLineId(),
    date: "",
    journal: "ACH",
    facture: "",
    libelle: "",
    compte: "",
    tiers: "",
    debit: "",
    credit: "",
    tva: "20",
  };
}

export const hasAmount = (line) => toCents(line.debit) !== 0 || toCents(line.credit) !== 0;

export const isLineBlank = (line) =>
  !line.date &&
  !line.facture.trim() &&
  !line.libelle.trim() &&
  !line.compte &&
  !line.tiers.trim() &&
  !line.debit.trim() &&
  !line.credit.trim();

const LINE_FIELDS = ["date", "journal", "facture", "libelle", "compte", "tiers", "debit", "credit", "tva"];

function restoreLine(line) {
  const restored = { ...createEmptyLine(), id: typeof line?.id === "string" ? line.id : createLineId() };
  LINE_FIELDS.forEach((field) => typeof line?.[field] === "string" && (restored[field] = line[field]));
  return restored;
}

function readLegacyDraft() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY));
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.filter((line) => line && typeof line.id === "string").map(restoreLine);
  } catch {
    return null;
  }
}

export function useJournalLines() {
  const draftLines = useAccountingStore((state) => state.draftLines);
  const hasHydrated = useAccountingStore((state) => state.hasHydrated);
  const setDraftLines = useAccountingStore((state) => state.setDraftLines);
  const [journalLines, setJournalLines] = useState(() => [createEmptyLine()]);
  const hydratedRef = useRef(false);
  const skipNextWrite = useRef(false);

  // Wait for Zustand persist, then adopt the stored grid (or the previous localStorage draft).
  useEffect(() => {
    if (!hasHydrated || hydratedRef.current) return;
    hydratedRef.current = true;
    const legacy = readLegacyDraft();
    const source = Array.isArray(draftLines) && draftLines.length > 0 ? draftLines : legacy;
    if (source) {
      skipNextWrite.current = true;
      setJournalLines(source.map(restoreLine));
    }
    if (legacy) localStorage.removeItem(DRAFT_STORAGE_KEY);
  }, [hasHydrated, draftLines]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }
    setDraftLines(journalLines.every(isLineBlank) ? null : journalLines);
  }, [journalLines, setDraftLines]);

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
    setJournalLines([createEmptyLine()]);
  }, []);

  const replaceLines = useCallback((lines) => {
    if (!Array.isArray(lines) || lines.length === 0) {
      setJournalLines([createEmptyLine()]);
      return;
    }
    setJournalLines(lines.map(restoreLine));
  }, []);

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

  return { journalLines, totals, updateLine, addLine, removeLine, reset, replaceLines };
}
