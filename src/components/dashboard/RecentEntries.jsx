import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS = {
  validated: { label: "Validée", variant: "success" },
  draft: { label: "Brouillon", variant: "warning" },
};

export function RecentEntries({ entries }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Dernières écritures</CardTitle>
          <CardDescription>5 dernières saisies du journal</CardDescription>
        </div>
        <Link to="/saisie" className="text-sm font-medium text-primary hover:underline">
          Nouvelle saisie
        </Link>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="py-2 font-medium">Date</th>
              <th scope="col" className="py-2 font-medium">Pièce</th>
              <th scope="col" className="py-2 font-medium">Libellé</th>
              <th scope="col" className="py-2 text-right font-medium">Montant</th>
              <th scope="col" className="py-2 text-right font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                  Aucune écriture enregistrée.
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b last:border-0">
                <td className="py-2.5 text-muted-foreground">{formatDate(entry.date)}</td>
                <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-xs">{entry.piece}</td>
                <td className="py-2.5">{entry.label}</td>
                <td className="py-2.5 text-right tabular-nums">{formatCurrency(entry.amount)}</td>
                <td className="py-2.5 text-right">
                  <Badge variant={STATUS[entry.status].variant}>{STATUS[entry.status].label}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
