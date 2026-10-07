import { describeInvoiceSplit } from "@/lib/invoiceSplit";
import { formatCurrency } from "@/lib/utils";

export function InvoiceSplitHint({ lines }) {
  const recap = describeInvoiceSplit(lines);
  if (!recap) return null;

  const ht = formatCurrency(recap.htCents / 100);
  const tva = formatCurrency(recap.tvaCents / 100);
  const ttc = formatCurrency(recap.ttcCents / 100);
  const isPurchase = recap.kind === "purchase";
  const party = recap.supplier || (isPurchase ? "le fournisseur" : "le client");

  return (
    <aside className="mb-3 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
      <p className="font-medium text-foreground">
        {isPurchase ? "Une facture d'achat = 3 lignes qui s'équilibrent" : "Une facture de vente = 3 lignes qui s'équilibrent"}
        {recap.facture ? ` · n° ${recap.facture}` : ""}
      </p>
      <p className="mt-1 text-muted-foreground">
        Les colonnes HT / TVA / TTC décrivent <span className="font-medium text-foreground">la même pièce</span> (chiffres
        répétés). Débit et crédit sont l'écriture : ce n'est pas 3 factures.
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
        <li>
          {isPurchase ? "Achat" : "Vente"} <span className="font-medium text-foreground">HT {ht}</span> — le montant hors taxe
        </li>
        <li>
          TVA {recap.rate ? `${recap.rate} %` : ""} <span className="font-medium text-foreground">{tva}</span> —{" "}
          {isPurchase ? "la taxe récupérable" : "la taxe collectée"}
        </li>
        <li>
          {isPurchase ? "Fournisseur" : "Client"} <span className="font-medium text-foreground">TTC {ttc}</span> — ce que vous{" "}
          {isPurchase ? `devez à ${party}` : `facturez à ${party}`}
        </li>
      </ol>
      <p className="mt-2 text-foreground">
        {ht} + {tva} = <span className="font-semibold">{ttc}</span>. N'additionnez pas les TTC des 3 lignes : c'est le même
        total, répété. Le TTC de la facture est uniquement {ttc}.
      </p>
    </aside>
  );
}
