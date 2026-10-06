import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  fetchAccounts,
  fetchDashboardAlerts,
  fetchJournalEntries,
  postJournalEntry,
  putJournalEntry,
} from "@/services/journalApi";

const EMPTY_ALERTS = { drafts: 0, late_invoices: 0, unlettered: 0, solde_restant: "0.00" };

/**
 * Shared journal for saisie, the dashboard, and the grand livre.
 * Open grid drafts are keyed by company so dossiers stay isolated.
 * `journalEntries` and `alerts` come from the Laravel API for the current dossier.
 */
export const useAccountingStore = create(
  persist(
    (set, get) => ({
      journalEntries: [],
      alerts: EMPTY_ALERTS,
      accounts: [],
      draftLinesByCompany: {},
      hasHydrated: false,
      syncStatus: "idle",
      syncError: null,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setDraftLines: (companyId, draftLines) => {
        if (!companyId) return;
        set({
          draftLinesByCompany: {
            ...get().draftLinesByCompany,
            [String(companyId)]: draftLines,
          },
        });
      },
      hydrateFromApi: async () => {
        set({ journalEntries: [], alerts: EMPTY_ALERTS, syncStatus: "loading", syncError: null });
        try {
          const [journalEntries, alerts, accounts] = await Promise.all([
            fetchJournalEntries(),
            fetchDashboardAlerts(),
            fetchAccounts(),
          ]);
          set({ journalEntries, alerts, accounts, syncStatus: "ready", syncError: null });
        } catch (error) {
          set({
            journalEntries: [],
            alerts: EMPTY_ALERTS,
            accounts: [],
            syncStatus: "error",
            syncError: error instanceof Error ? error.message : "API injoignable",
          });
        }
      },
      saveJournalEntry: async (payload, entryId) => {
        const entry = entryId ? await putJournalEntry(entryId, payload) : await postJournalEntry(payload);
        set({
          journalEntries: [entry, ...get().journalEntries.filter((existing) => existing.id !== entry.id)],
        });
        try {
          const alerts = await fetchDashboardAlerts();
          set({ alerts, syncStatus: "ready", syncError: null });
        } catch {
          set({
            alerts: {
              ...get().alerts,
              drafts: entry.is_draft ? get().alerts.drafts + 1 : get().alerts.drafts,
            },
          });
        }
        return entry;
      },
      addAccount: (account) => {
        if (!account?.id) return;
        const accounts = get().accounts;
        if (accounts.some((existing) => String(existing.id) === String(account.id))) return;
        set({ accounts: [...accounts, account] });
      },
    }),
    {
      name: "compta-mvp:accounting",
      version: 3,
      migrate: () => ({
        draftLinesByCompany: {},
      }),
      partialize: (state) => ({
        draftLinesByCompany: state.draftLinesByCompany,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

if (typeof window !== "undefined" && !useAccountingStore.getState().hasHydrated) {
  queueMicrotask(() => {
    if (!useAccountingStore.getState().hasHydrated) {
      useAccountingStore.setState({ hasHydrated: true });
    }
  });
}
