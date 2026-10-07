import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import { itemsToText } from "@/lib/pdfItems";

GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

/** Extracts the selectable text of a PDF file. Scanned pages come back empty. */
export async function extractPdfText(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const task = getDocument({ data, verbosity: 0 });
  try {
    const document = await task.promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(itemsToText(content.items));
    }
    return pages.join("\n").trim();
  } finally {
    await task.destroy();
  }
}
