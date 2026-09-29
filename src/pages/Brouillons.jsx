import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FilePenLine } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listDrafts, resumeDraft, summarizeDraft } from "@/lib/drafts";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export default function Brouillons() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState(() => listDrafts());

  const rows = useMemo(
    () =>
      drafts.map((draft) => ({
        ...draft,
        ...summarizeDraft(draft),
      })),
    [drafts]
  );

  const handleResume = (id) => {
    if (!resumeDraft(id)) {
      setDrafts(listDrafts());
      return;
    }
    navigate("/saisie");
  };

  return (
    <>
      <PageHeader description="Reprenez les écritures en attente de validation avant de les enregistrer au journal." />

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">Brouillons d'écritures comptables</caption>
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">
                Date de création
              </th>
              <th scope="col" className="px-4 py-2.5 font-semibold">
                N° de pièce / facture
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                Montant (total)
              </th>
              <th scope="col" className="px-4 py-2.5 font-semibold">
                Statut
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Aucun brouillon en attente.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0 hover:bg-muted/40">
                <td className="px-4 py-2.5 text-muted-foreground">{formatDate(row.createdAt)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">{row.facture}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(row.amount)}</td>
                <td className="px-4 py-2.5">
                  {row.isBalanced ? (
                    <Badge variant="success">Équilibré</Badge>
                  ) : (
                    <Badge variant="warning">À corriger</Badge>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button size="sm" variant="outline" onClick={() => handleResume(row.id)}>
                    <FilePenLine aria-hidden="true" />
                    Reprendre
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className={cn("mt-3 text-xs text-muted-foreground", rows.length === 0 && "hidden")}>
        {rows.length} brouillon{rows.length > 1 ? "s" : ""} enregistré{rows.length > 1 ? "s" : ""} sur cet appareil.
      </p>
    </>
  );
}
