import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchCompanies, selectCompany } from "@/services/journalApi";
import { setActiveCompanyId } from "@/services/companyContext";

export const useCompanyStore = create(
  persist(
    (set, get) => ({
      hasHydrated: false,
      companies: [],
      currentCompanyId: null,
      loadError: null,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setCurrentCompanyId: (currentCompanyId) => {
        setActiveCompanyId(currentCompanyId);
        set({ currentCompanyId });
      },
      loadCompanies: async () => {
        try {
          const companies = await fetchCompanies();
          const known = get().currentCompanyId;
          const stillThere = companies.some((company) => String(company.id) === String(known));
          const currentCompanyId = stillThere ? String(known) : companies[0] ? String(companies[0].id) : null;
          setActiveCompanyId(currentCompanyId);
          set({ companies, currentCompanyId, loadError: null });
          return { companies, currentCompanyId };
        } catch (error) {
          set({ loadError: error instanceof Error ? error.message : "Sociétés injoignables" });
          throw error;
        }
      },
      switchCompany: async (companyId) => {
        const id = String(companyId);
        setActiveCompanyId(id);
        set({ currentCompanyId: id });
        try {
          await selectCompany(id);
        } catch {
          // Listing still works even if the open-log call fails.
        }
      },
      currentCompany: () => get().companies.find((company) => String(company.id) === String(get().currentCompanyId)) ?? null,
    }),
    {
      name: "compta-mvp:company",
      version: 1,
      partialize: (state) => ({ currentCompanyId: state.currentCompanyId }),
      onRehydrateStorage: () => () => {
        const current = useCompanyStore.getState();
        setActiveCompanyId(current.currentCompanyId ?? null);
        current.setHasHydrated(true);
      },
    }
  )
);
