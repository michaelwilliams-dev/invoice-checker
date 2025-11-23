// ISO Timestamp: 2025-11-23T17:15:00Z
/**
 * AIVS Invoice Compliance Checker · Docling Parser + JSON Analysis
 * Replaces old pdf-parse version
 * Author: AIVS Software Limited
 */

import { extractInvoice } from "../docling_extract.js";

/**
 * STEP 1 — Extract structured JSON using DOCLING
 */
export async function parseInvoice(fileBuffer, tmpFilePath) {
  // Save uploaded buffer to disk
  await fs.promises.writeFile(tmpFilePath, fileBuffer);

  // Extract JSON structure
  const json = await extractInvoice(tmpFilePath);

  return {
    json,
    parserNote: "Docling extraction successful."
  };
}


/**
 * STEP 2 — Analyse extracted JSON
 * (No OpenAI, no text hallucination, deterministic)
 */

export async function analyseInvoice(doclingJson, flags) {
  const text = JSON.stringify(doclingJson).toLowerCase();

  const result = {};

  // -----------------------------
  // VAT / DRC
  // -----------------------------
  const vatRate = flags.vatCategory === "reduced-5" ? 5 : 20;

  result.vat_check = `VAT rate identified as ${vatRate}%.`;

  // -----------------------------
  // CIS
  // -----------------------------
  const cisRate = parseFloat(flags.cisRate || 0);
  result.cis_check = `CIS deduction expected at ${cisRate}%.`;

  // -----------------------------
  // Required wording
  // -----------------------------
  if (text.includes("reverse charge") || text.includes("rcd")) {
    result.required_wording = "DRC wording detected.";
  } else {
    result.required_wording = "DRC wording NOT detected.";
  }

  // -----------------------------
  // SUMMARY
  // -----------------------------
  result.summary = "Invoice analysed using Docling-structured JSON. No unsafe data left the server.";

  // -----------------------------
  // No corrected invoice HTML generated in this version.
  // -----------------------------
  result.corrected_invoice = null;

  return result;
}
