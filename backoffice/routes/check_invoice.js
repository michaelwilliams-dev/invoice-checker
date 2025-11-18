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

/* Load metadata (even if blank text — relevance still works) */
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

/* Minimal vector loader (no text merging, relevance only) */
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

        // Attach metadata row (titles, groups, etc — NO text needed)
        const meta = metadata[processed] || {};

        vectors.push({
          ...obj,
          meta  
        });

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
   MAIN ROUTE — RESTORED SIMPLE VERSION
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
    console.log("🟢 /check_invoice");

    if (!req.files?.file) throw new Error("No file uploaded");

    const file = req.files.file;

    // Restore original flag set — NO CIS engine
    const flags = {
      vatCategory: req.body.vatCategory,
      endUserConfirmed: req.body.endUserConfirmed,
      cisRate: req.body.cisRate
    };

    const parsed = await parseInvoice(file.data);
    /* -------------------------------------------------------------
      DRC / VAT / CIS AUTO-CORRECTION ENGINE (NEW)
    ------------------------------------------------------------- */

    function detectDRC(parsed, flags) {
      const text = (parsed.text || "").toLowerCase();
    
      // construction indicators
      const constructionKeywords = [
        "carpentry",
        "carpenter",
        "deck",
        "roof",
        "roofing",
        "brickwork",
        "bricklayer",
        "plastering",
        "drylining",
        "joinery",
        "building",
        "construction",
        "site labour",
        "labour"
      ];
      const hasConstructionWord = constructionKeywords.some((kw) =>
        text.includes(kw)
      );
    
      // VAT @ 20% being wrongly shown
      const shows20pcVat = /vat\s*\(?\s*20%|\b20%\s*vat\b/.test(text);
    
      // CIS present in text or user input
      const cisFlag = !!(flags.cisRate && flags.cisRate !== "0");
      const mentionsCIS = text.includes("cis") || cisFlag;
    
      // DRC applies when all three conditions are true
      return hasConstructionWord && shows20pcVat && mentionsCIS;
    }

    function correctDRC(parsed) {
      // Extract net from parsed invoice
        
      let net = 0;

      // Try main patterns: "Subtotal £1,200.00" or "Subtotal\n£1,200.00"
      const netMatch =
        parsed.text.match(/subtotal[^£]*£\s*([\d,]+\.\d{2})/i) ||
        parsed.text.match(/total net[^£]*£\s*([\d,]+\.\d{2})/i) ||
        parsed.text.match(/net[^£]*£\s*([\d,]+\.\d{2})/i);

      // Fallback: any standalone currency amount
      if (!netMatch) {
        const fallback = parsed.text.match(/£\s*([\d,]+\.\d{2})/);
        if (fallback) net = parseFloat(fallback[1].replace(/,/g, ""));
      } else {
        net = parseFloat(netMatch[1].replace(/,/g, ""));
      }
      // CIS = 20% of net
      const cis = +(net * 0.20).toFixed(2);

      // Total due = net - cis
      const totalDue = +(net - cis).toFixed(2);

      return {
        vat_check: "VAT removed – Domestic Reverse Charge applies.",
        cis_check: `CIS deduction at 20% applied: £${cis}`,
        required_wording:
          "Reverse Charge: Customer to account for VAT to HMRC. VAT Act 1994 Section 55A.",
        summary: `Corrected: Net £${net}, CIS £${cis}, Total Due £${totalDue}`,
        corrected_invoice: `
          <p><strong>Corrected Invoice:</strong></p>
          <p>Net: £${net}</p>
          <p>VAT: Reverse Charge (Customer to account for VAT)</p>
          <p>CIS (20%): £${cis}</p>
          <p><strong>Total Due: £${totalDue}</strong></p>
        `
      };
    }

    let drcReply = null;

    if (detectDRC(parsed, flags) || flags.cisRate === "20") {
      console.log("⚠️ DRC detected – applying correction");
      drcReply = correctDRC(parsed);
    }
    /* FAISS relevance only */
    let faissContext = "";
    try {
      const matches = await searchIndex(parsed.text, faissIndex);
      faissContext = matches.map((m) => m.meta?.title || "").join("\n");
    } catch (err) {
      console.log("⚠️ FAISS relevance error:", err.message);
    }

    /* AI analysis (unchanged — uses your original invoice_tools.js) */
    
    let aiReply;

    if (drcReply) {
      // DRC logic overrides the AI
      aiReply = drcReply;
    } else {
      // Default: use original AI behaviour
      aiReply = await analyseInvoice(parsed.text, flags, faissContext);
    }
    /* Generate report files */
    const { docPath, pdfPath, timestamp } = await saveReportFiles(aiReply);

    /* Optionally send email */
    await sendReportEmail(
      req.body.userEmail,
      [req.body.emailCopy1, req.body.emailCopy2].filter(Boolean),
      aiReply,
      docPath,
      pdfPath,
      timestamp
    );

    res.json({
      parserNote: parsed.parserNote,
      aiReply,
      timestamp
    });

  } catch (err) {
    console.error("❌ /check_invoice error:", err.message);
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
