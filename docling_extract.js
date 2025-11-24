
// ISO Timestamp: 2025-11-24T12:00:00Z
/**
 * docling_extract.js – AIVS Invoice Extractor (HARDENED VERSION)
 * Stops crashes on malformed PDFs and always returns a stable JSON object.
 */

import { readFile } from "fs/promises";
import { PdfReader } from "@docling/document-model/pdf";
import { DocumentAnalyzer } from "@docling/analysis";
import { JsonExporter } from "@docling/export-json";

export async function extractInvoice(filePath) {
  try {
    const fileBytes = await readFile(filePath);

    let model;

    try {
      // Primary PDF extraction
      const reader = new PdfReader(fileBytes);
      model = await reader.extract();
    } catch (pdfErr) {
      console.warn("⚠️ Primary PDF extract failed:", pdfErr.message);

      const fileExt = filePath.toLowerCase();

      // Image masquerading as PDF:
      if (
        fileExt.endsWith(".jpg") ||
        fileExt.endsWith(".jpeg") ||
        fileExt.endsWith(".png")
      ) {
        return {
          status: "image_fallback",
          text: "",
          message:
            "Image extraction not supported yet – please upload a proper PDF invoice.",
        };
      }

      // Proper PDF but broken
      return {
        status: "pdf_error",
        error: "Invalid or corrupted PDF structure. Unable to extract text.",
      };
    }

    // Step 2 – Analyse
    const analyzer = new DocumentAnalyzer();
    const analysed = analyzer.analyze(model);

    // Step 3 – Export JSON
    const exporter = new JsonExporter();
    const json = exporter.export(analysed);

    return {
      status: "ok",
      extracted: json,
    };
  } catch (err) {
    console.error("❌ Docling extraction fatal error:", err);

    return {
      status: "fatal_error",
      error: err.message || "Unknown Docling error",
    };
  }
}
