import { ArrowLeftRight, FileUp, Maximize2, Minimize2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SaisieToolbar({ swapped, enlarged, onSwap, onToggleEnlarge, onChangePdf, onNewTier }) {
  return (
    <div
      role="toolbar"
      aria-label="Disposition de la saisie"
      className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2 shadow-sm"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={onSwap}
        aria-pressed={swapped}
        title="Inverser les panneaux"
      >
        <ArrowLeftRight aria-hidden="true" />
        Inverser
      </Button>

      <Button
        variant={enlarged ? "secondary" : "outline"}
        size="sm"
        onClick={onToggleEnlarge}
        aria-pressed={enlarged}
        title={enlarged ? "Quitter le plein écran" : "Afficher les deux panneaux en plein écran"}
      >
        {enlarged ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
        {enlarged ? "Réduire" : "Plein écran"}
      </Button>

      {onChangePdf && (
        <Button variant="outline" size="sm" onClick={onChangePdf} title="Remplacer la pièce PDF">
          <FileUp aria-hidden="true" />
          Changer le PDF
        </Button>
      )}

      {onNewTier && (
        <Button variant="outline" size="sm" onClick={onNewTier} title="Créer un client ou un fournisseur">
          <UserPlus aria-hidden="true" />
          Nouveau tiers
        </Button>
      )}

      <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
        Entrée : ligne suivante · Tab : cellule suivante
      </span>
    </div>
  );
}
