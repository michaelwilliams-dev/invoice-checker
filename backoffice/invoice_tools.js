/**
 * AIVS Invoice Compliance Checker · Parsing & Analysis Tools
 * ISO Timestamp: 2025-11-09T18:30:00Z
 * Author: AIVS Software Limited
 * Brand Colour: #4e65ac
 */

import pdf from "pdf-parse";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function parseInvoice(fileBuffer) {
  const data = await pdf(fileBuffer);
  return { text: data.text, parserNote: "Invoice parsed successfully." };
}

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

  const reduced = flags.vatCategory === "reduced-5" || /reduced rate|5%/.test(t);
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

export async function analyseInvoice(text, flags) {
  const vatDecision = decideVatAndDRC(text, flags);

  const prompt = `
You are a UK accounting compliance expert (HMRC CIS & VAT).
Use the user-supplied context below to check this invoice.

Context:
- VAT category: ${vatDecision.vatLabel}
- DRC applies: ${vatDecision.drc ? "Yes" : "No"}
- CIS rate: ${flags.cisRate}%
- Reason: ${vatDecision.reason}

Please return a JSON object with the following structure:
{
  "vat_check": "...",
  "cis_check": "...",
  "required_wording": "...",
  "corrected_invoice": "...",
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
    return result;
  } catch (err) {
    console.error("⚠️ JSON parse error:", err.message);
    return { error: "Invalid JSON returned from AI" };
  }
}
