/**
 * AIVS Invoice Compliance Checker · Express Route
 * ISO Timestamp: 2025-11-14T16:30:00Z
 * Author: AIVS Software Limited
 */

import express from "express";
import fileUpload from "express-fileupload";
import fs from "fs";
import { OpenAI } from "openai";

import { parseInvoice, analyseInvoice } from "../invoice_tools.js";
import { saveReportFiles, sendReportEmail } from "../../server.js";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_APIKEY || process.env.OPENAI_API_KEY,
});

/* -------------------------------------------------------------
   FAISS (Relevance Only — No Text Required)
------------------------------------------------------------- */

const INDEX_PATH = "/mnt/data/vector.index";
const META_PATH  = "/mnt/data/chunks_metadata.final.jsonl";
const LIMIT      = 10000;

let metadata = [];
let faissIndex = [];

/* Load metadata */
try {
  console.log("🔍 Loading FAISS metadata...");
  metadata = fs
    .readFileSync(META_PATH, "utf8")
    .trim()
    .split("\n")
    .slice(0, LIMIT)
    .map((l) => JSON.parse(l));

  console.log("✅ Loaded metadata lines:", metadata.length);
} catch (err) {
  console.error("❌ Metadata load error:", err.message);
  metadata = [];
}

/* Load vector.index */
async function loadIndex(limit = LIMIT) {
  console.log(`📦 Loading vector.index (limit ${limit})`);

  const fd = await fs.promises.open(INDEX_PATH, "r");
  const stream = fd.createReadStream({ encoding: "utf8" });

  let buffer = "";
  const vectors = [];
  let processed = 0;

  for await (const chunk of stream) {
    buffer += chunk;
    const parts = buffer.split("},");
    buffer = parts.pop();

    for (const p of parts) {
      if (!p.includes('"embedding"')) continue;

      try {
        const obj = JSON.parse(p.endsWith("}") ? p : p + "}");
        const meta = metadata[processed] || {};
        vectors.push({ ...obj, meta });
        processed++;

        if (vectors.length >= limit) {
          console.log("🛑 Vector limit reached");
          await fd.close();
          return vectors;
        }
      } catch {}
    }
  }

  await fd.close();
  console.log(`✅ Loaded ${vectors.length} vectors`);
  return vectors;
}

/* Preload FAISS */
(async () => {
  try {
    faissIndex = await loadIndex(LIMIT);
    console.log(`🟢 FAISS READY (${faissIndex.length} vectors)`);
  } catch (err) {
    console.error("❌ FAISS preload failed:", err.message);
  }
})();

/* Dot product relevance */
function dotProduct(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

/* Semantic search */
async function searchIndex(query, index) {
  if (!query || query.length < 3) return [];

  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: [query],
  });

  const q = emb.data[0].embedding;

  const scored = index.map((v) => ({
    ...v,
    score: dotProduct(q, v.embedding),
  }));

  return scored.sort((a, b) => b.score - a.score).slice(0, 10);
}

/* -------------------------------------------------------------
   MAIN ROUTE — ROLLBACK LOGIC (NO MULTI-LINE PARSER)
------------------------------------------------------------- */

router.use(
  fileUpload({
    parseNested: true,
    useTempFiles: false,
    preserveExtension: true,
  })
);

router.post("/check_invoice", async (req, res) => {
  try {
    console.log("🟢 /check_invoice (ROLLBACK)");

    if (!req.files?.file) throw new Error("No file uploaded");
    const file = req.files.file;

    const flags = {
      vatCategory: req.body.vatCategory,
      endUserConfirmed: req.body.endUserConfirmed,
      cisRate: req.body.cisRate
    };

    const parsed = await parseInvoice(file.data);
    const text = parsed.text || "";
    console.log("📄 PARSED TEXT:", text);

    /* -------------------------------------------------------------
       ONLY USE TOTAL NET — ORIGINAL WORKING METHOD
------------------------------------------------------------- */

    let net = 0;
    const netMatch = text.match(/TOTAL\s*NET[^0-9]*([\d,]+)/i);
    if (netMatch) {
      net = parseFloat(netMatch[1].replace(/,/g, ""));
    }

    if (!net || net <= 0) {
      return res.json({
        parserNote: "TOTAL NET not found",
        aiReply: {
          vat_check: "Unable to determine VAT.",
          cis_check: "Unable to determine CIS.",
          required_wording: "Invoice incomplete.",
          summary: "Insufficient data to generate corrected invoice.",
          corrected_invoice: null
        }
      });
    }

    /* CIS is simple: 20% unless no labour */
    const cis = +(net * 0.20).toFixed(2);

    /* DRC detection */
    const lower = text.toLowerCase();
    const drc =
      (lower.includes("labour") ||
        lower.includes("construction") ||
        lower.includes("builder")) &&
      lower.includes("vat") &&
      lower.includes("20");

    /* Total Due */
    const totalDue = +(net - cis).toFixed(2);

    /* -------------------------------------------------------------
       ORIGINAL SIMPLE OUTPUT — THIS IS WHAT WORKED
------------------------------------------------------------- */

    const aiReply = {
      vat_check: drc
        ? "VAT removed – Domestic Reverse Charge applies."
        : "VAT reviewed.",

      cis_check:
        lower.includes("labour") || lower.includes("construction")
          ? `CIS deduction at 20% applied: £${cis}`
          : "CIS does not apply to this invoice.",

      required_wording: drc
        ? "Reverse Charge: Customer must account for VAT to HMRC (VAT Act 1994 Section 55A)."
        : "Standard VAT rules apply.",

      summary: `Corrected: Net £${net}, CIS £${cis}, Total Due £${totalDue}`,

      corrected_invoice: `
        <div style="font-family:Arial, sans-serif; font-size:14px;">
          <h3 style="color:#4e65ac;">Corrected Invoice</h3>

          <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
            <tr>
              <th style="border:1px solid #ccc; padding:8px;">Description</th>
              <th style="border:1px solid #ccc; padding:8px; text-align:right;">Qty</th>
              <th style="border:1px solid #ccc; padding:8px; text-align:right;">Unit (£)</th>
              <th style="border:1px solid #ccc; padding:8px; text-align:right;">Line Total (£)</th>
            </tr>

            <tr>
              <td style="border:1px solid #ccc; padding:8px;">Invoice item</td>
              <td style="border:1px solid #ccc; padding:8px; text-align:right;">1</td>
              <td style="border:1px solid #ccc; padding:8px; text-align:right;">${net.toFixed(2)}</td>
              <td style="border:1px solid #ccc; padding:8px; text-align:right;">${net.toFixed(2)}</td>
            </tr>

            <tr>
              <td colspan="3" style="border:1px solid #ccc; padding:8px; text-align:right; font-weight:bold;">VAT (Reverse Charge)</td>
              <td style="border:1px solid #ccc; padding:8px; text-align:right;">£0.00</td>
            </tr>

            <tr>
              <td colspan="3" style="border:1px solid #ccc; padding:8px; text-align:right;">CIS (20%)</td>
              <td style="border:1px solid #ccc; padding:8px; text-align:right;">-£${cis.toFixed(2)}</td>
            </tr>

            <tr>
              <td colspan="3" style="border:1px solid #ccc; padding:8px; background:#eef3ff; text-align:right; font-weight:bold;">Total Due</td>
              <td style="border:1px solid #ccc; padding:8px; background:#eef3ff; text-align:right; font-weight:bold;">£${totalDue}</td>
            </tr>
          </table>
        </div>
      `
    };

    /* Generate report */
    const { docPath, pdfPath, timestamp } = await saveReportFiles(aiReply);

    /* Optional email */
    await sendReportEmail(
      req.body.userEmail,
      [req.body.emailCopy1, req.body.emailCopy2].filter(Boolean),
      aiReply,
      docPath,
      pdfPath,
      timestamp
    );

    return res.json({
      parserNote: parsed.parserNote,
      aiReply,
      timestamp
    });

  } catch (err) {
    console.error("❌ /check_invoice error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------
   /faiss-test — unchanged
------------------------------------------------------------- */

router.get("/faiss-test", async (req, res) => {
  try {
    const matches = await searchIndex("CIS VAT rules", faissIndex);
    const top = matches[0] || {};

    res.json({
      ok: true,
      matchCount: matches.length,
      topScore: top.score || 0,
      preview: top.meta ? top.meta.title : "NONE"
    });

  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

export default router;
