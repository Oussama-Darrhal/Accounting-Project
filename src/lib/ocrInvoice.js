import { createWorker } from "tesseract.js";

const PSM_SPARSE = "4";

function publicUrl(path) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${path}`;
}

async function createFrenchWorker() {
  const worker = await createWorker("fra", 1, {
    workerPath: publicUrl("/tesseract/worker.min.js"),
    corePath: publicUrl("/tesseract-core"),
    langPath: publicUrl("/tessdata"),
    gzip: true,
    workerBlobURL: true,
    logger: () => {},
  });
  await worker.setParameters({
    tessedit_pageseg_mode: PSM_SPARSE,
    preserve_interword_spaces: "1",
  });
  return worker;
}

async function prepareImage(source) {
  if (typeof createImageBitmap !== "function") return source;
  const bitmap = await createImageBitmap(source);
  const scale = bitmap.width < 1400 ? 2 : bitmap.width < 2000 ? 1.4 : 1;
  if (scale === 1) return bitmap;
  const canvas = globalThis.document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas;
}

async function recognizeSource(worker, source) {
  const prepared = await prepareImage(source);
  const { data } = await worker.recognize(prepared);
  if (prepared && prepared !== source && typeof prepared.close === "function") prepared.close();
  return String(data?.text ?? "").trim();
}

export async function ocrFile(file) {
  const worker = await createFrenchWorker();
  try {
    return await recognizeSource(worker, file);
  } finally {
    await worker.terminate();
  }
}

export async function ocrPdfFile(file) {
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = new Uint8Array(await file.arrayBuffer());
  const task = getDocument({ data, verbosity: 0 });
  const worker = await createFrenchWorker();
  try {
    const pdf = await task.promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2.2 });
      const canvas = globalThis.document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const canvasContext = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
      await page.render({ canvasContext, viewport }).promise;
      pages.push(await recognizeSource(worker, canvas));
    }
    return pages.filter(Boolean).join("\n");
  } finally {
    await worker.terminate();
    await task.destroy();
  }
}
