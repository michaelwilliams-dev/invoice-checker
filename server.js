/**
 * AIVS Invoice Compliance Checker · Stand-Alone Service
 * ISO Timestamp: 2025-11-09T19:20:00Z
 * Author: AIVS Software Limited
 * Brand Colour: #4e65ac
 */

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import checkInvoiceRoute from "./backoffice/routes/check_invoice.js";

// ----------------------------------------------------
// Initialise
// ----------------------------------------------------
console.log("🔧 Booting AIVS Invoice Checker server …");

// Node ESM path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ----------------------------------------------------
// Middleware
// ----------------------------------------------------
app.use(
  cors({
    origin: [
      "https://invoice-checker-0miv.onrender.com",
      "http://invoice-checker-0miv.onrender.com",
      "https://assistants.aivs.uk",
      "https://property-assistant-plus.onrender.com"
    ],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------------------------------------
// Static files and routes
// ----------------------------------------------------
app.use(express.static(path.join(__dirname, "public")));
app.use("/", checkInvoiceRoute);

// ----------------------------------------------------
// Start server (Render supplies PORT env var)
// ----------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ AIVS Invoice Checker running on port ${PORT}`);
});

// ----------------------------------------------------
// AIVS Security Guard: prevent raw invoice uploads to OpenAI
// ----------------------------------------------------
import fs from "fs";

function safeForAI(input) {
  const hasBinary = Buffer.isBuffer(input);
  const isLarge = typeof input === "string" && input.length > 20000;
  const looksLikeFile = /%PDF|PK\x03\x04|<xml/i.test(input);

  if (hasBinary || isLarge || looksLikeFile) {
    console.warn("🚫 BLOCKED: attempt to send raw file data to OpenAI prevented");
    return false;
  }
  return true;
}

async function askOpenAI(prompt) {
  if (!safeForAI(prompt)) {
    throw new Error("Unsafe input blocked — raw invoice data must not leave server");
  }
  console.log("✅ OK: sending clean text to OpenAI");
  // place your actual OpenAI call here
  // const response = await openai.chat.completions.create({...});
}

// ----------------------------------------------------
// AIVS Report File Generator (Word + PDF with timestamp)
// ----------------------------------------------------
import { Document, Packer, Paragraph, TextRun } from "docx";
import PDFDocument from "pdfkit";

const __reportDir = path.join(__dirname, "generated");
if (!fs.existsSync(__reportDir)) fs.mkdirSync(__reportDir, { recursive: true });

export async function saveReportFiles(aiReply) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = `invoice_report_${timestamp}`;

  // --- Word (.docx) structured report -----------------------------
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: "AIVS Invoice Checker", bold: true, size: 28 })
          ],
        }),
        new Paragraph({ text: `Generated: ${timestamp}` }),
        new Paragraph({ text: "" }),
        new Paragraph({ text: "AI Compliance Report", heading: "Heading1" }),
        new Paragraph({ text: `VAT / DRC Check: ${aiReply.vat_check || "—"}` }),
        new Paragraph({ text: `CIS Check: ${aiReply.cis_check || "—"}` }),
        new Paragraph({ text: `Required Wording: ${aiReply.required_wording || "—"}` }),
        new Paragraph({ text: `Summary: ${aiReply.summary || "—"}` }),
        new Paragraph({
          text: "\n--- End of report ---\n© AIVS Software Limited",
          italics: true,
          spacing: { before: 400 },
        }),
      ],
    }],
  });

  const docPath = path.join(__reportDir, `${baseName}.docx`);
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(docPath, buffer);

  // --- PDF raw dump -----------------------------------------------
  const pdfPath = path.join(__reportDir, `${baseName}_raw.pdf`);
  const pdf = new PDFDocument();
  pdf.pipe(fs.createWriteStream(pdfPath));
  pdf.fontSize(14).text("AIVS RAW AI OUTPUT – UNEDITED ARCHIVE COPY", { align: "center" });
  pdf.moveDown();
  pdf.fontSize(10).text(`Generated: ${timestamp}`);
  pdf.moveDown();
  pdf.fontSize(11).text(JSON.stringify(aiReply, null, 2));
  pdf.end();

  console.log("✅ Report files saved:", docPath, pdfPath);
  return { docPath, pdfPath };
}
