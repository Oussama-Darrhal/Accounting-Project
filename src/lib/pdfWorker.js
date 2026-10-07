import { GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

/** Vite serves the public worker as `pdf.worker.min.mjs?import` (404). Use the bundled URL. */
GlobalWorkerOptions.workerSrc = workerUrl;
