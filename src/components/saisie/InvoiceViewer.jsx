import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Download, FileText, LoaderCircle, Maximize2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isLineBlank } from "@/hooks/useJournalLines";
import { downloadBlob } from "@/lib/download";
import { cn } from "@/lib/utils";

const LiveInvoicePDF = lazy(() => import("@/components/saisie/LiveInvoicePDF"));

function getFilename(lines) {
  const facture = lines.find((line) => line.facture.trim())?.facture.trim();
  return `${(facture ?? "ecriture-brouillon").replace(/[^\w.-]+/g, "_")}.pdf`;
}

function sameLines(left, right) {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  return left.every((line, index) => {
    const other = right[index];
    return (
      line.id === other.id &&
      line.date === other.date &&
      line.facture === other.facture &&
      line.compte === other.compte &&
      line.debit === other.debit &&
      line.credit === other.credit &&
      line.tva === other.tva
    );
  });
}

export function InvoiceViewer({ journalLines }) {
  const [pdfSnapshot, setPdfSnapshot] = useState(journalLines);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isDirty = useMemo(() => !sameLines(journalLines, pdfSnapshot), [journalLines, pdfSnapshot]);
  const isSnapshotEmpty = pdfSnapshot.every(isLineBlank);
  const filename = getFilename(pdfSnapshot);

  const handleRefreshPreview = () => setPdfSnapshot(journalLines);

  const handleDownloadInvoice = async () => {
    setDownloading(true);
    try {
      const { renderInvoiceBlob } = await import("@/components/saisie/LiveInvoicePDF");
      downloadBlob(await renderInvoiceBlob(pdfSnapshot), filename);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (!isFullscreen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isFullscreen]);

  return (
    <section
      aria-label="Aperçu du document"
      className={cn(
        isFullscreen
          ? "fixed inset-0 z-[100] flex flex-col bg-background/95 p-6 backdrop-blur-sm"
          : "flex min-h-[420px] flex-col overflow-hidden rounded-lg border bg-card shadow-sm md:min-h-0"
      )}
    >
      <div className="flex min-h-11 flex-wrap items-center gap-2 border-b px-4 py-2 text-sm font-medium">
        <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 truncate">{filename}</span>

        {isDirty && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-amber-500" />
            Aperçu non synchronisé
          </span>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefreshPreview}
            disabled={!isDirty}
            className="h-7 px-2.5"
          >
            <RefreshCw aria-hidden="true" />
            <span className="hidden sm:inline">Actualiser l'aperçu</span>
            <span className="sr-only sm:hidden">Actualiser l'aperçu</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadInvoice}
            disabled={isSnapshotEmpty || downloading}
            className="h-7 px-2.5"
            title={`Télécharger ${filename}`}
          >
            {downloading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
            <span className="hidden sm:inline">Télécharger</span>
            <span className="sr-only sm:hidden">Télécharger {filename}</span>
          </Button>
          {isFullscreen ? (
            <Button type="button" size="sm" onClick={() => setIsFullscreen(false)} className="h-8">
              <X aria-hidden="true" />
              Fermer
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setIsFullscreen(true)}
              title="Plein écran"
            >
              <Maximize2 aria-hidden="true" />
              <span className="sr-only">Plein écran</span>
            </Button>
          )}
        </div>
      </div>

      <div className={cn("flex min-h-0 flex-1 bg-slate-200", isFullscreen ? "rounded-md p-2" : "p-2")}>
        {isSnapshotEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-slate-500">
            <FileText className="size-12" aria-hidden="true" strokeWidth={1.25} />
            <p className="text-lg font-semibold">Aperçu du document</p>
            <p className="text-xs">Aucune donnée saisie. L'aperçu s'affichera ici.</p>
          </div>
        ) : (
          <Suspense
            fallback={
              <div role="status" className="flex flex-1 items-center justify-center text-slate-500">
                <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
                <span className="sr-only">Chargement de l'aperçu…</span>
              </div>
            }
          >
            <LiveInvoicePDF data={pdfSnapshot} />
          </Suspense>
        )}
      </div>
    </section>
  );
}
