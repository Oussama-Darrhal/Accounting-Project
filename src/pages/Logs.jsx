import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { fetchActivityLogs } from "@/services/journalApi";
import { useCompanyStore } from "@/stores/useCompanyStore";
import { formatDate } from "@/lib/utils";

function formatDateTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${formatDate(iso)} ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

const ACTION_LABELS = {
  "journal.posted": "Écriture",
  "journal.draft": "Brouillon",
  "company.opened": "Dossier",
  "company.updated": "Paramètres",
  "lettrage.matched": "Lettrage",
  "lettrage.unmatched": "Délettrage",
};

export default function Logs() {
  const currentCompanyId = useCompanyStore((state) => state.currentCompanyId);
  const current = useCompanyStore((state) =>
    state.companies.find((company) => String(company.id) === String(state.currentCompanyId))
  );
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentCompanyId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRows([]);
    fetchActivityLogs()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Impossible de charger les logs.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentCompanyId]);

  return (
    <>
      <PageHeader
        description={
          current
            ? `Historique du dossier ${current.name} uniquement. Les autres sociétés du groupe ont le leur.`
            : "Historique des actions du dossier courant."
        }
      />

      {error && (
        <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">Logs d'activité du dossier</caption>
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">Date</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Action</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Message</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Auteur</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  Chargement des logs…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  Aucun log pour ce dossier. Enregistrez une écriture ou ouvrez le dossier pour en créer.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{formatDateTime(row.createdAt)}</td>
                  <td className="px-4 py-2 font-medium">{ACTION_LABELS[row.action] ?? row.action}</td>
                  <td className="px-4 py-2">{row.message}</td>
                  <td className="px-4 py-2 text-muted-foreground">{row.actor}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
