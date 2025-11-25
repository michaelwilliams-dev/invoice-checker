// ISO Timestamp: 2025-11-24T18:33:00Z
/**
 * pdf_extract.js – AIVS Invoice Text Extractor (pdfjs-dist)
 * Replaces ALL Docling extractors (Render-safe).
 */

import fs from "fs";
import pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

export async function extractInvoice(filePath) {
  try {
    // Load PDF into buffer
    const data = fs.readFileSync(filePath);

    // FIX: pdfjs requires Uint8Array, not Buffer
    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(data)
    }).promise;

    let fullText = "";

    // Read all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      fullText += content.items.map((s) => s.str).join(" ") + "\n";
    }

    // Return consistent result object
    return {
      status: "ok",
      extracted: { text: fullText }
    };

  } catch (err) {
    console.error("❌ pdf_extract.js error:", err);
    return {
      status: "pdf_error",
      error: "Unable to extract text from PDF."
    };
  }
}
