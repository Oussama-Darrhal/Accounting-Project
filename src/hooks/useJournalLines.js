import { useCallback, useEffect, useMemo, useState } from "react";
import { toCents } from "@/lib/utils";

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

function readDraft() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY));
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const fields = ["date", "journal", "facture", "libelle", "compte", "tiers", "debit", "credit", "tva"];
    return parsed
      .filter((line) => line && typeof line.id === "string")
      .map((line) => {
        const restored = { ...createEmptyLine(), id: line.id };
        fields.forEach((field) => typeof line[field] === "string" && (restored[field] = line[field]));
        return restored;
      });
  } catch {
    return null;
  }
}

export function useJournalLines() {
  const [journalLines, setJournalLines] = useState(() => readDraft() ?? [createEmptyLine()]);

  // A blank grid removes the key, so a completed save leaves no stale draft behind.
  useEffect(() => {
    if (journalLines.every(isLineBlank)) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } else {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(journalLines));
    }
  }, [journalLines]);

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
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setJournalLines([createEmptyLine()]);
  }, []);

  const replaceLines = useCallback((lines) => {
    if (!Array.isArray(lines) || lines.length === 0) {
      setJournalLines([createEmptyLine()]);
      return;
    }
    const fields = ["date", "journal", "facture", "libelle", "compte", "tiers", "debit", "credit", "tva"];
    setJournalLines(
      lines.map((line) => {
        const next = createEmptyLine();
        fields.forEach((field) => {
          if (typeof line?.[field] === "string") next[field] = line[field];
        });
        return next;
      })
    );
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
