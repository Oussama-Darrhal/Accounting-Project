import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toCents } from "@/lib/utils";
import { applyPostedAmounts, hydrateLineAmounts, syncInvoiceTax } from "@/lib/tva";
import { useAccountingStore } from "@/stores/useAccountingStore";
import { useCompanyStore } from "@/stores/useCompanyStore";

export const DRAFT_STORAGE_KEY = "saisie_comptable_draft";

let lineSequence = 0;

/** Date.now() alone collides when two lines are created in the same millisecond. */
const createLineId = () => `line-${Date.now()}-${(lineSequence += 1)}`;

function defaultTvaRate() {
  const company = useCompanyStore.getState().currentCompany();
  return String(company?.default_tva_rate ?? 20);
}

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
    ht: "",
    ttc: "",
    debit: "",
    credit: "",
    tva: defaultTvaRate(),
  };
}

export const hasAmount = (line) => toCents(line.debit) !== 0 || toCents(line.credit) !== 0;

export const isLineBlank = (line) =>
  !line.date &&
  !line.facture.trim() &&
  !line.libelle.trim() &&
  !line.compte &&
  !line.tiers.trim() &&
  !String(line.ht ?? "").trim() &&
  !String(line.ttc ?? "").trim() &&
  !line.debit.trim() &&
  !line.credit.trim();

const LINE_FIELDS = ["date", "journal", "facture", "libelle", "compte", "tiers", "ht", "ttc", "debit", "credit", "tva"];

function asAmountString(value) {
  if (value == null || value === "") return "";
  return typeof value === "number" ? String(value) : String(value);
}

function restoreLine(line) {
  const restored = { ...createEmptyLine(), id: typeof line?.id === "string" ? line.id : createLineId() };
  LINE_FIELDS.forEach((field) => {
    if (line?.[field] == null || line[field] === "") return;
    restored[field] = asAmountString(line[field]);
  });
  if (toCents(restored.ht) && toCents(restored.ttc)) {
    return applyPostedAmounts(restored);
  }
  const amounts = hydrateLineAmounts({ ...line, ...restored });
  restored.ht = amounts.ht;
  restored.ttc = amounts.ttc;
  return applyPostedAmounts(restored);
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
  const companyId = useCompanyStore((state) => state.currentCompanyId);
  const draftLines = useAccountingStore((state) =>
    companyId ? state.draftLinesByCompany?.[String(companyId)] ?? null : null
  );
  const hasHydrated = useAccountingStore((state) => state.hasHydrated);
  const setDraftLines = useAccountingStore((state) => state.setDraftLines);
  const [journalLines, setJournalLines] = useState(() => [createEmptyLine()]);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const hydratedForCompany = useRef(null);
  const skipNextWrite = useRef(false);

  useEffect(() => {
    if (!hasHydrated || !companyId) return;
    if (hydratedForCompany.current === companyId) return;
    hydratedForCompany.current = companyId;
    const legacy = readLegacyDraft();
    const source = Array.isArray(draftLines) && draftLines.length > 0 ? draftLines : legacy;
    skipNextWrite.current = true;
    setEditingEntryId(null);
    setJournalLines(source && source.length > 0 ? source.map(restoreLine) : [createEmptyLine()]);
    if (legacy) localStorage.removeItem(DRAFT_STORAGE_KEY);
  }, [hasHydrated, companyId, draftLines]);

  useEffect(() => {
    if (!companyId || hydratedForCompany.current !== companyId) return;
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }
    setDraftLines(companyId, journalLines.every(isLineBlank) ? null : journalLines);
  }, [journalLines, setDraftLines, companyId]);

  const updateLine = useCallback((id, field, value) => {
    setJournalLines((current) => syncInvoiceTax(current, id, field, value));
  }, []);

  const addLine = useCallback(() => {
    setJournalLines((current) => [...current, createEmptyLine()]);
  }, []);

  const removeLine = useCallback((id) => {
    setJournalLines((current) => (current.length > 1 ? current.filter((line) => line.id !== id) : current));
  }, []);

  const reset = useCallback(() => {
    setEditingEntryId(null);
    setJournalLines([createEmptyLine()]);
  }, []);

  const replaceLines = useCallback((lines) => {
    if (!Array.isArray(lines) || lines.length === 0) {
      setJournalLines([createEmptyLine()]);
      return;
    }
    setJournalLines(lines.map(restoreLine));
  }, []);

  const loadEntry = useCallback((entry) => {
    setEditingEntryId(entry?.id ?? null);
    skipNextWrite.current = true;
    const source = (entry?.lines ?? []).map((line) => ({
      id: typeof line.id === "string" ? line.id : createLineId(),
      date: line.date || entry.date_piece || "",
      journal: line.journal || entry.journal || "ACH",
      facture: String(line.facture || entry.reference_piece || ""),
      libelle: String(line.libelle || ""),
      compte: String(line.compte || ""),
      tiers: String(line.tiers || ""),
      debit: line.debit ? String(line.debit) : "",
      credit: line.credit ? String(line.credit) : "",
      tva: String(line.tva ?? 20),
      ht: line.ht ?? line.base_ht ?? "",
      ttc: line.ttc ?? "",
      montant_tva: line.montant_tva,
      base_ht: line.base_ht,
    }));
    setJournalLines(source.length > 0 ? source.map(restoreLine) : [createEmptyLine()]);
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

  return useMemo(
    () => ({ journalLines, totals, updateLine, addLine, removeLine, reset, replaceLines, loadEntry, editingEntryId }),
    [journalLines, totals, updateLine, addLine, removeLine, reset, replaceLines, loadEntry, editingEntryId]
  );
}
