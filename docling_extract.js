/**
 * Docling Invoice Extractor
 * Reads a PDF invoice and outputs structured JSON
 * Ready to feed into your invoice checker
 */

import { readFile } from "fs/promises";
import { PdfReader } from "@docling/document-model/pdf";
import { DocumentAnalyzer } from "@docling/analysis";
import { JsonExporter } from "@docling/export-json";

/* ------------ MAIN EXTRACTION FUNCTION ---------------- */

export async function extractInvoiceData(pdfPath) {
  try {
    // 1. Load PDF into Docling reader
    const pdfBytes = await readFile(pdfPath);
    const pdfReader = new PdfReader(pdfBytes);

    // 2. Extract high-level document model
    const documentModel = await pdfReader.extract();

    // 3. Analyze the document (tables, sections, headers)
    const analyzer = new DocumentAnalyzer();
    const analyzed = analyzer.analyze(documentModel);

    // 4. Export everything as JSON
    const exporter = new JsonExporter();
    const json = exporter.export(analyzed);

    return json;

  } catch (err) {
    console.error("❌ Docling extraction failed:", err);
    return null;
  }
}

/* ------------ TEST RUNNER (OPTIONAL) ---------------- */

if (process.argv[2]) {
  const pdfPath = process.argv[2];
  extractInvoiceData(pdfPath).then((data) => {
    console.log(JSON.stringify(data, null, 2));
  });
}
