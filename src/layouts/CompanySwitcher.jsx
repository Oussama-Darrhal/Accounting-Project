import { Building2 } from "lucide-react";
import { Select } from "@/components/ui/select";
import { useCompanyStore } from "@/stores/useCompanyStore";

export function CompanySwitcher() {
  const companies = useCompanyStore((state) => state.companies);
  const currentCompanyId = useCompanyStore((state) => state.currentCompanyId);
  const switchCompany = useCompanyStore((state) => state.switchCompany);
  const loadError = useCompanyStore((state) => state.loadError);
  const hasHydrated = useCompanyStore((state) => state.hasHydrated);
  const current = companies.find((company) => String(company.id) === String(currentCompanyId));

  if (!hasHydrated || (companies.length === 0 && !loadError)) {
    return <p className="ml-auto truncate text-sm text-muted-foreground">Chargement des dossiers…</p>;
  }

  if (loadError) {
    return (
      <p role="alert" className="ml-auto truncate text-sm text-destructive">
        {loadError}
      </p>
    );
  }

  if (companies.length === 0) return null;

  return (
    <div className="ml-auto flex min-w-0 max-w-full items-center gap-2">
      <Building2 className="hidden size-4 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
      <div className="min-w-0">
        {current?.umbrella && (
          <p className="hidden truncate text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
            {current.umbrella}
          </p>
        )}
        <Select
          aria-label="Dossier société"
          className="h-9 min-w-[12rem] max-w-[18rem] font-medium"
          value={currentCompanyId ?? ""}
          onChange={(event) => {
            const id = event.target.value;
            if (!id || id === String(currentCompanyId)) return;
            switchCompany(id);
          }}
        >
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
