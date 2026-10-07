import { hasUsableInvoiceText, isImageFile, isInvoiceFile, isPdfFile } from "@/lib/invoiceFiles";
import { extractPdfText } from "@/lib/pdfText";

export { hasUsableInvoiceText, isImageFile, isInvoiceFile, isPdfFile };

/** Reads selectable PDF text, or OCRs a photo / scanned PDF. */
export async function extractInvoiceText(file) {
  if (isImageFile(file)) {
    const { ocrFile } = await import("@/lib/ocrInvoice");
    return ocrFile(file);
  }
  if (!isPdfFile(file)) return "";

  const text = await extractPdfText(file);
  if (hasUsableInvoiceText(text)) return text;

  const { ocrPdfFile } = await import("@/lib/ocrInvoice");
  const ocr = await ocrPdfFile(file);
  if (hasUsableInvoiceText(ocr)) return ocr;
  return [text, ocr].filter(Boolean).join("\n").trim();
}
