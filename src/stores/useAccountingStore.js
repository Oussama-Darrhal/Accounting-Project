import { create } from "zustand";
import { persist } from "zustand/middleware";
import { payloadIsDraft } from "@/lib/ledger";

/**
 * Shared journal for saisie, the dashboard, and the grand livre.
 * `draftLines` is the grid currently being typed.
 * `journalEntries` is what Enregistrer / Brouillon has committed.
 * An entry with is_draft true is unbalanced and stays off the grand livre.
 */
export const useAccountingStore = create(
  persist(
    (set, get) => ({
      journalEntries: [],
      draftLines: null,
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setDraftLines: (draftLines) => set({ draftLines }),
      saveJournalEntry: (payload) => {
        const lines = payload?.lines ?? [];
        const entry = {
          id: `EC-${Date.now()}`,
          is_draft: payloadIsDraft(lines),
          savedAt: new Date().toISOString(),
          lines,
        };
        set({ journalEntries: [entry, ...get().journalEntries] });
        return entry;
      },
    }),
    {
      name: "compta-mvp:accounting",
      partialize: (state) => ({
        journalEntries: state.journalEntries,
        draftLines: state.draftLines,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
