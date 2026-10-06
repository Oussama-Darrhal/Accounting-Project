import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchDashboardAlerts, fetchJournalEntries, postJournalEntry } from "@/services/journalApi";

const EMPTY_ALERTS = { drafts: 0, late_invoices: 0, solde_restant: "0.00" };

/**
 * Shared journal for saisie, the dashboard, and the grand livre.
 * `draftLines` is the grid currently being typed (local only).
 * `journalEntries` and `alerts` come from the Laravel API.
 */
export const useAccountingStore = create(
  persist(
    (set, get) => ({
      journalEntries: [],
      alerts: EMPTY_ALERTS,
      draftLines: null,
      hasHydrated: false,
      syncStatus: "idle",
      syncError: null,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setDraftLines: (draftLines) => set({ draftLines }),
      hydrateFromApi: async () => {
        set({ syncStatus: "loading", syncError: null });
        try {
          const [journalEntries, alerts] = await Promise.all([fetchJournalEntries(), fetchDashboardAlerts()]);
          set({ journalEntries, alerts, syncStatus: "ready", syncError: null });
        } catch (error) {
          set({
            syncStatus: "error",
            syncError: error instanceof Error ? error.message : "API injoignable",
          });
        }
      },
      saveJournalEntry: async (payload) => {
        const entry = await postJournalEntry(payload);
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
    }),
    {
      name: "compta-mvp:accounting",
      version: 2,
      migrate: (persistedState) => ({
        draftLines: persistedState?.draftLines ?? null,
      }),
      partialize: (state) => ({
        draftLines: state.draftLines,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
