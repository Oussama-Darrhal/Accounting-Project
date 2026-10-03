import { useState } from "react";
import { ArrowLeftRight, Minimize2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EntryForm } from "@/components/saisie/EntryForm";
import { InvoiceViewer } from "@/components/saisie/InvoiceViewer";
import { SaisieToolbar } from "@/components/saisie/SaisieToolbar";
import { Button } from "@/components/ui/button";
import { useJournalLines } from "@/hooks/useJournalLines";
import { cn } from "@/lib/utils";

export default function SaisieComptable() {
  const [swapped, setSwapped] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const journal = useJournalLines();

  // Keyed children let React move the real DOM nodes on swap (tab order follows the visual order).
  const viewer = <InvoiceViewer key="viewer" journalLines={journal.journalLines} />;
  const form = <EntryForm key="form" journal={journal} />;
  const panels = swapped ? [form, viewer] : [viewer, form];

  if (enlarged) {
    return (
      <div className="fixed inset-0 z-50 grid h-full min-h-0 grid-cols-1 gap-3 bg-background p-3 md:grid-rows-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4 md:p-4">
        <div className="h-full min-h-0 [&>section]:h-full">{panels[0]}</div>

        <div className="flex items-center justify-center gap-2 md:flex-col">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSwapped((value) => !value)}
            aria-pressed={swapped}
            title="Inverser les panneaux"
          >
            <ArrowLeftRight aria-hidden="true" />
            Inverser
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEnlarged(false)}
            title="Quitter le plein écran"
          >
            <Minimize2 aria-hidden="true" />
            Quitter le plein écran
          </Button>
        </div>

        <div className="h-full min-h-0 [&>section]:h-full">{panels[1]}</div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        description="Saisissez les lignes de l'écriture à partir de la pièce justificative."
      />

      <SaisieToolbar
        swapped={swapped}
        enlarged={enlarged}
        onSwap={() => setSwapped((value) => !value)}
        onToggleEnlarge={() => setEnlarged((value) => !value)}
      />

      <div
        className={cn("grid grid-cols-1 gap-4 md:h-[calc(100vh-15rem)] md:min-h-[520px] md:grid-cols-2")}
      >
        {panels}
      </div>
    </>
  );
}
