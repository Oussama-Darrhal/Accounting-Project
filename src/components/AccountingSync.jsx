import { useEffect } from "react";
import { useAccountingStore } from "@/stores/useAccountingStore";
import { useCompanyStore } from "@/stores/useCompanyStore";

/** Loads the company list, then journal data for the current dossier. */
export function AccountingSync() {
  const hasHydrated = useCompanyStore((state) => state.hasHydrated);
  const loadCompanies = useCompanyStore((state) => state.loadCompanies);
  const currentCompanyId = useCompanyStore((state) => state.currentCompanyId);
  const hydrateFromApi = useAccountingStore((state) => state.hydrateFromApi);

  useEffect(() => {
    if (!hasHydrated) return undefined;
    loadCompanies().catch(() => {});
  }, [hasHydrated, loadCompanies]);

  useEffect(() => {
    if (!currentCompanyId) return undefined;
    hydrateFromApi();
  }, [currentCompanyId, hydrateFromApi]);

  return null;
}
