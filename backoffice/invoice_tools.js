/**
 * AIVS Invoice Compliance Checker · Parsing & Analysis Tools
 * ISO Timestamp: 2025-11-14T16:15:00Z
 * Author: AIVS Software Limited
 * Brand Colour: #4e65ac
 */

import pdf from "pdf-parse";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* -------------------------------------------------------------
   PDF PARSER
------------------------------------------------------------- */
export async function parseInvoice(fileBuffer) {
  const data = await pdf(fileBuffer);
  return { text: data.text, parserNote: "Invoice parsed successfully." };
}

/* -------------------------------------------------------------
   VAT + DRC ENGINE (DETERMINISTIC)
------------------------------------------------------------- */
function decideVatAndDRC(text, flags) {
  const t = text.toLowerCase();
  const isNewBuild =
    /new build|new dwelling|plot \d+|nhbc|completion certificate|cml/.test(t) ||
    flags.vatCategory === "zero-rated-new-build";

  if (isNewBuild) {
    return {
      vatRate: 0,
      vatLabel: "Zero-rated (new build dwelling)",
      drc: false,
      reason: "New build dwelling → zero-rated; DRC excluded."
    };
  }

  const reduced = flags.vatCategory === "reduced-5";
  const endUser = flags.endUserConfirmed === "true";

  return {
    vatRate: reduced ? 5 : 20,
    vatLabel: reduced ? "Reduced rate 5%" : "Standard rate 20%",
    drc: !endUser && !isNewBuild,
    reason: endUser
      ? "End-user/intermediary declared → DRC excluded."
      : "Standard/reduced-rated supply → DRC may apply."
  };
}

/* -------------------------------------------------------------
   INVOICE ANALYSIS (CIS + VAT deterministic)
   LLM used ONLY for formatting + report writing
------------------------------------------------------------- */

export async function analyseInvoice(text, flags, faissContext = "") {
  // 1) Deterministic VAT/DRC
  const vatDecision = decideVatAndDRC(text, flags);

  // 2) Deterministic CIS
  const labour = Number(flags.labour || 0);
  const materials = Number(flags.materials || 0);
  const cisRate = Number(flags.cisRate || 20);

  const cisResult = computeCIS({
    labourAmount: labour,
    materialsAmount: materials,
    cisRate,
    vatCategory: flags.vatCategory,
    endUserConfirmed: flags.endUserConfirmed === "true",
    isConstruction: true
  });

  // 3) Build structured system message for LLM
  const systemPrompt = `
You are a UK CIS & VAT compliance assistant.

Use ONLY the deterministic CIS and VAT computations below.
DO NOT invent numbers.
DO NOT alter CIS or VAT calculations.

CIS Computation:
${JSON.stringify(cisResult, null, 2)}

VAT/DRC Decision:
${JSON.stringify(vatDecision, null, 2)}

FAISS Context:
${faissContext || "None"}

Your tasks:
1. Explain CIS treatment and why it applies or not.
2. Explain VAT/DRC treatment.
3. Identify missing required wording.
4. Provide corrected invoice wording where necessary.
5. Populate the JSON fields exactly as requested by the user:

{
  "vat_check": "...",
  "cis_check": "...",
  "required_wording": "...",
  "corrected_invoice": "<HTML invoice layout>",
  "summary": "..."
}

ONLY return JSON.
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: systemPrompt }]
  });

  // 4) Parse JSON returned by LLM (safe)
  try {
    const result = JSON.parse(res.choices[0].message.content);

    // Replace "No VAT" with correct zero-rated wording
    if (result.corrected_invoice && result.corrected_invoice.includes("No VAT")) {
      result.corrected_invoice = result.corrected_invoice.replace(/No VAT/gi, "Zero-rated (0 %)");
    }

    // Attach deterministic CIS + VAT to output for audit
    result.cis_engine = cisResult;
    result.vat_engine = vatDecision;

    return result;

  } catch (err) {
    console.error("⚠️ JSON parse error:", err.message);
    return { error: "Invalid JSON returned from AI" };
  }
}
