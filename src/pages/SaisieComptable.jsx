import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, FilePlus2, FileText, FileUp, LoaderCircle, Minimize2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EntryForm } from "@/components/saisie/EntryForm";
import { InvoiceViewer } from "@/components/saisie/InvoiceViewer";
import { SaisieToolbar } from "@/components/saisie/SaisieToolbar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { useJournalLines } from "@/hooks/useJournalLines";
import { parseInvoiceText } from "@/lib/invoiceParse";
import { cn } from "@/lib/utils";

export default function SaisieComptable() {
  const [documentMode, setDocumentMode] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [reading, setReading] = useState(false);
  const fileInputRef = useRef(null);
  const dialogRef = useRef(null);
  const [swapped, setSwapped] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const journal = useJournalLines();
  const { toast } = useToast();

  useEffect(() => {
    if (!documentMode) dialogRef.current?.focus();
  }, [documentMode]);

  useEffect(() => {
    if (!enlarged) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setEnlarged(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enlarged]);

  const ingestFile = async (file) => {
    if (!file || reading) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast({
        variant: "error",
        title: "Format non pris en charge",
        description: "Déposez une facture au format PDF.",
      });
      return;
    }

    setReading(true);
    setUploadedFile(file);
    try {
      const { extractPdfText } = await import("@/lib/pdfText");
      const text = await extractPdfText(file);
      const parsed = parseInvoiceText(text);
      if (!parsed.ok) {
        toast({ variant: "warning", title: "Saisie manuelle", description: parsed.reason, duration: 8000 });
      } else {
        journal.replaceLines(parsed.lines);
        toast({
          variant: parsed.warnings.length ? "warning" : "success",
          title: "Écriture préremplie depuis le PDF",
          description: [parsed.summary, ...parsed.warnings].join(" "),
          duration: parsed.warnings.length ? 9000 : 6000,
        });
      }
    } catch (error) {
      const protectedPdf = error?.name === "PasswordException";
      toast({
        variant: "error",
        title: protectedPdf ? "PDF protégé" : "Lecture impossible",
        description: protectedPdf
          ? "Ce PDF demande un mot de passe. Saisissez l'écriture à la main."
          : "Ce PDF n'a pas pu être analysé. La pièce reste affichée pour une saisie manuelle.",
        duration: 8000,
      });
    } finally {
      setReading(false);
      setDocumentMode("uploaded");
    }
  };

  const handleFileChange = (event) => {
    const [file] = event.target.files ?? [];
    event.target.value = "";
    ingestFile(file);
  };

  // Keyed children let React move the real DOM nodes on swap (tab order follows the visual order).
  const viewer = <InvoiceViewer key="viewer" journalLines={journal.journalLines} uploadedFile={uploadedFile} />;
  const form = <EntryForm key="form" journal={journal} />;
  const panels = swapped ? [form, viewer] : [viewer, form];

  if (enlarged && documentMode) {
    return (
      <div className="fixed inset-0 z-50 grid h-dvh min-h-0 grid-cols-1 gap-3 overflow-y-auto bg-background p-3 md:grid-rows-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4 md:overflow-hidden md:p-4">
        <div className="min-h-96 md:h-full md:min-h-0 [&>section]:h-full md:[&>section]:min-h-0">{panels[0]}</div>

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
          <Button variant="secondary" size="sm" onClick={() => setEnlarged(false)} title="Quitter le plein écran">
            <Minimize2 aria-hidden="true" />
            Quitter le plein écran
          </Button>
        </div>

        <div className="min-h-96 md:h-full md:min-h-0 [&>section]:h-full md:[&>section]:min-h-0">{panels[1]}</div>
      </div>
    );
  }

  return (
    <>
      {!documentMode && (
        <div
          ref={dialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 outline-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="saisie-start-title"
          aria-busy={reading}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            ingestFile(event.dataTransfer.files?.[0]);
          }}
        >
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
              <Button type="button" variant="outline" className="h-auto justify-start p-4 text-left" onClick={() => setDocumentMode("new")} disabled={reading}>
                <FilePlus2 aria-hidden="true" />
                <span>
                  <span className="block font-semibold">Créer un nouveau PDF</span>
                  <span className="mt-1 block whitespace-normal text-xs font-normal text-muted-foreground">Générer l’aperçu depuis les lignes saisies.</span>
                </span>
              </Button>
              <Button type="button" variant="outline" className="h-auto justify-start p-4 text-left" onClick={() => fileInputRef.current?.click()} disabled={reading}>
                <FileUp aria-hidden="true" />
                <span>
                  <span className="block font-semibold">Ajouter un PDF</span>
                  <span className="mt-1 block whitespace-normal text-xs font-normal text-muted-foreground">La facture s'affiche et les lignes se remplissent toutes seules.</span>
                </span>
              </Button>
            </div>

            {reading && (
              <p role="status" className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Lecture de la facture et remplissage des champs…
              </p>
            )}

            <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={handleFileChange} />
          </div>
        </div>
      )}

      <PageHeader description="Saisissez les lignes de l'écriture à partir de la pièce justificative." />

      <SaisieToolbar
        swapped={swapped}
        enlarged={enlarged}
        onSwap={() => setSwapped((value) => !value)}
        onToggleEnlarge={() => setEnlarged((value) => !value)}
      />

      <div className={cn("grid grid-cols-1 gap-4 md:h-[calc(100vh-15rem)] md:min-h-[520px] md:grid-cols-2")}>
        {panels}
      </div>
    </>
  );
}
