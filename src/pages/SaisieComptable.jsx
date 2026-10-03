import { useRef, useState } from "react";
import { ArrowLeftRight, FilePlus2, FileText, FileUp, Minimize2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EntryForm } from "@/components/saisie/EntryForm";
import { InvoiceViewer } from "@/components/saisie/InvoiceViewer";
import { SaisieToolbar } from "@/components/saisie/SaisieToolbar";
import { Button } from "@/components/ui/button";
import { useJournalLines } from "@/hooks/useJournalLines";
import { cn } from "@/lib/utils";

export default function SaisieComptable() {
  const [documentMode, setDocumentMode] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);
  const [swapped, setSwapped] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const journal = useJournalLines();

  const handleFileChange = (event) => {
    const [file] = event.target.files;
    if (!file) return;
    setUploadedFile(file);
    setDocumentMode("uploaded");
    event.target.value = "";
  };

  // Keyed children let React move the real DOM nodes on swap (tab order follows the visual order).
  const viewer = <InvoiceViewer key="viewer" journalLines={journal.journalLines} uploadedFile={uploadedFile} />;
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
      {!documentMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="saisie-start-title">
          <div className="w-full max-w-xl rounded-xl border bg-card p-6 shadow-xl">
            <div className="mb-6 flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 id="saisie-start-title" className="text-lg font-semibold">Quelle pièce souhaitez-vous traiter ?</h2>
                <p className="mt-1 text-sm text-muted-foreground">Choisissez un mode pour ouvrir la saisie comptable.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" variant="outline" className="h-auto justify-start p-4 text-left" onClick={() => setDocumentMode("new")}>
                <FilePlus2 aria-hidden="true" />
                <span>
                  <span className="block font-semibold">Créer un nouveau PDF</span>
                  <span className="mt-1 block whitespace-normal text-xs font-normal text-muted-foreground">Générer l’aperçu depuis les lignes saisies.</span>
                </span>
              </Button>
              <Button type="button" variant="outline" className="h-auto justify-start p-4 text-left" onClick={() => fileInputRef.current?.click()}>
                <FileUp aria-hidden="true" />
                <span>
                  <span className="block font-semibold">Ajouter des PDF existants</span>
                  <span className="mt-1 block whitespace-normal text-xs font-normal text-muted-foreground">Lire une facture pendant son enregistrement.</span>
                </span>
              </Button>
            </div>

            <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={handleFileChange} />
          </div>
        </div>
      )}

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
