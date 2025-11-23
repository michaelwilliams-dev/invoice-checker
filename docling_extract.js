/**
 * Docling Invoice Extractor
 * Free, local, no billing.
 * Converts ANY PDF invoice into clean JSON for the Invoice Checker.
 */

import { readFile } from "fs/promises";
import { PdfReader } from "@docling/document-model/pdf";
import { DocumentAnalyzer } from "@docling/analysis";
import { JsonExporter } from "@docling/export-json";

export async function extractInvoice(pdfPath) {
  try {
    const pdfBuffer = await readFile(pdfPath);

    // 1. Load PDF
    const reader = new PdfReader(pdfBuffer);
    const model = await reader.extract();

    // 2. Analyse layout (tables, blocks, reading order)
    const analyzer = new DocumentAnalyzer();
    const analysed = analyzer.analyze(model);

    // 3. Export to JSON object
    const exporter = new JsonExporter();
    const json = exporter.export(analysed);

    return json;

  } catch (err) {
    console.error("❌ Docling extraction failed:", err);
    return null;
  }
}
