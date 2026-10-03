import { ArrowLeftRight, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SaisieToolbar({ swapped, enlarged, onSwap, onToggleEnlarge }) {
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
        title={enlarged ? "Réafficher la facture" : "Agrandir la saisie"}
      >
        {enlarged ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
        {enlarged ? "Réduire" : "Agrandir"}
      </Button>

      <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
        Entrée : ligne suivante · Tab : cellule suivante
      </span>
    </div>
  );
}
