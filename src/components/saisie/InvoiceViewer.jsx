import { lazy, Suspense, useEffect, useState } from "react";
import { Download, FileText, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isLineBlank } from "@/hooks/useJournalLines";
import { downloadBlob } from "@/lib/download";

const LiveInvoicePDF = lazy(() => import("@/components/saisie/LiveInvoicePDF"));

function getFilename(journalLines) {
  const facture = journalLines.find((line) => line.facture.trim())?.facture.trim();
  return `${(facture ?? "ecriture-brouillon").replace(/[^\w.-]+/g, "_")}.pdf`;
}

export function InvoiceViewer({ journalLines, uploadedFile }) {
  const [downloading, setDownloading] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);
  const isEmpty = journalLines.every(isLineBlank);
  const filename = uploadedFile?.name ?? getFilename(journalLines);

  useEffect(() => {
    if (!uploadedFile) {
      setUploadedFileUrl(null);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(uploadedFile);
    setUploadedFileUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [uploadedFile]);

  const handleDownloadInvoice = async () => {
    setDownloading(true);
    try {
      if (uploadedFile) {
        downloadBlob(uploadedFile, filename);
        return;
      }
      const { renderInvoiceBlob } = await import("@/components/saisie/LiveInvoicePDF");
      downloadBlob(await renderInvoiceBlob(journalLines), filename);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section
      aria-label="Aperçu du document"
      className="flex min-h-[420px] flex-col overflow-hidden rounded-lg border bg-card shadow-sm md:min-h-0"
    >
      <div className="flex h-11 items-center gap-2 border-b px-4 text-sm font-medium">
        <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="truncate">{filename}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDownloadInvoice}
          disabled={(!uploadedFile && isEmpty) || downloading}
          className="ml-auto h-7 px-2.5"
          title={`Télécharger ${filename}`}
        >
          {downloading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
          <span className="hidden sm:inline">Télécharger</span>
          <span className="sr-only sm:hidden">Télécharger {filename}</span>
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 bg-slate-200 p-2">
        {uploadedFileUrl ? (
          <iframe
            title={`Lecture de ${uploadedFile.name}`}
            src={uploadedFileUrl}
            className="h-full min-h-[560px] w-full rounded-md border-none bg-white"
          />
        ) : isEmpty ? (
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
            <LiveInvoicePDF data={journalLines} />
          </Suspense>
        )}
      </div>
    </section>
  );
}
