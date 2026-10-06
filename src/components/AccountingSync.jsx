import { useEffect } from "react";
import { useAccountingStore } from "@/stores/useAccountingStore";

/** Loads journal entries and dashboard alerts from the API once the shell is open. */
export function AccountingSync() {
  const hydrateFromApi = useAccountingStore((state) => state.hydrateFromApi);

  useEffect(() => {
    hydrateFromApi();
  }, [hydrateFromApi]);

  return null;
}
