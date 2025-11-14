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
  const vatDecision = decideVatAndDRC(text, flags);

  const prompt = `
You are a UK accounting compliance expert (HMRC CIS & VAT).
Use the user-supplied context below to check this invoice.

Context:
- VAT category: ${vatDecision.vatLabel}
- DRC applies: ${vatDecision.drc ? "Yes" : "No"}
- CIS rate: ${flags.cisRate}%
- Reason: ${vatDecision.reason}

Check:
1. Whether VAT and DRC treatment are correct.
2. Whether CIS wording is correct for the labour element.
3. Whether required wording is present or missing.
4. Provide corrected wording and compliance notes.
5. Output a corrected invoice layout using the provided HTML template.

Return JSON ONLY:
{
  "vat_check": "...",
  "cis_check": "...",
  "required_wording": "...",
  "corrected_invoice": "<HTML invoice>",
  "summary": "..."
}

Invoice text:
${text}
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }]
  });

  try {
    const result = JSON.parse(res.choices[0].message.content);

    // Replace incorrect wording automatically
    if (result.corrected_invoice && result.corrected_invoice.includes("No VAT")) {
      result.corrected_invoice = result.corrected_invoice.replace(/No VAT/gi, "Zero-rated (0 %)");
    }

    return result;

  } catch (err) {
    console.error("⚠️ JSON parse error:", err.message);
    return { error: "Invalid JSON returned from AI" };
  }
}
