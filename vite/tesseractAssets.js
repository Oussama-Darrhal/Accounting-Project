import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const CORE_FILES = [
  "tesseract-core-lstm.wasm.js",
  "tesseract-core-simd-lstm.wasm.js",
  "tesseract-core-relaxedsimd-lstm.wasm.js",
];

/** Copies Tesseract worker, WASM and French traineddata into /public so OCR works offline. */
export function copyTesseractAssets() {
  const tessdir = join(root, "public", "tesseract");
  const coredir = join(root, "public", "tesseract-core");
  const langdir = join(root, "public", "tessdata");
  mkdirSync(tessdir, { recursive: true });
  mkdirSync(coredir, { recursive: true });
  mkdirSync(langdir, { recursive: true });
  copyFileSync(join(root, "node_modules/tesseract.js/dist/worker.min.js"), join(tessdir, "worker.min.js"));
  for (const name of CORE_FILES) {
    copyFileSync(join(root, "node_modules/tesseract.js-core", name), join(coredir, name));
  }
  copyFileSync(
    join(root, "node_modules/@tesseract.js-data/fra/4.0.0_best_int/fra.traineddata.gz"),
    join(langdir, "fra.traineddata.gz")
  );
  copyFileSync(
    join(root, "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs"),
    join(root, "public", "pdf.worker.min.mjs")
  );
}

export function tesseractPublicAssets() {
  return {
    name: "tesseract-public-assets",
    buildStart() {
      copyTesseractAssets();
    },
    configureServer() {
      copyTesseractAssets();
    },
  };
}
