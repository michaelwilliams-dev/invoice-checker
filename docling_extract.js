// ISO Timestamp: 2025-11-24T12:00:00Z
/**
 * docling_extract.js – AIVS Invoice Extractor (HARDENED VERSION)
 * Prevents crashes on malformed PDFs and always returns a stable JSON object.
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

      // If file is actually an image disguised as PDF → treat differently
      const fileExt = filePath.toLowerCase();

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

      // If the PDF is broken beyond repair
      return {
        status: "pdf_error",
        error: "Invalid or corrupted PDF structure. Unable to extract text.",
      };
    }

    // Run analysis
    const analyzer = new DocumentAnalyzer();
    const analysed = analyzer.analyze(model);

    // Export JSON
    const exporter = new JsonExporter();
    const json = exporter.export(analysed);

    // Guarantee stable structure
    return {
      status: "ok",
      source: filePath,
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
