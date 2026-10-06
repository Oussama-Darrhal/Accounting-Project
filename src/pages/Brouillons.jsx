import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAccountingStore } from "@/stores/useAccountingStore";

export default function Brouillons() {
  const journalEntries = useAccountingStore((state) => state.journalEntries);
  const drafts = journalEntries.filter((entry) => entry.is_draft);

  return (
    <>
      <PageHeader description="Brouillons du dossier courant. Rouvrez une écriture pour la corriger et la valider." />

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="sr-only">Brouillons à corriger</caption>
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">Date</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Pièce</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Libellé</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">Débit</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">Crédit</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody>
            {drafts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Aucun brouillon. Les écritures déséquilibrées apparaîtront ici.
                </td>
              </tr>
            )}
            {drafts.map((entry) => {
              const first = entry.lines?.[0] ?? {};
              return (
                <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-2 text-muted-foreground">{formatDate(first.date || entry.date_piece)}</td>
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-xs">
                    <Link className="font-medium text-primary hover:underline" to={`/saisie?brouillon=${entry.id}`}>
                      {first.facture || entry.reference_piece || entry.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{first.libelle || "Brouillon"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(Number(entry.debit_total) || 0)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(Number(entry.credit_total) || 0)}</td>
                  <td className="px-4 py-2">
                    <Badge variant="warning">Brouillon</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
