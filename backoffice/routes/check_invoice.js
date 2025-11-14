/**
 * AIVS Invoice Compliance Checker · Express Route
 * ISO Timestamp: 2025-11-14T12:00:00Z
 * Author: AIVS Software Limited
 * Brand Colour: #4e65ac
 */

import express from "express";
import fileUpload from "express-fileupload";
import fs from "fs";
import OpenAI from "openai";

import { parseInvoice, analyseInvoice } from "../invoice_tools.js";
import { saveReportFiles, sendReportEmail } from "../../server.js";

const router = express.Router();

/* -------------------------------------------------------------
   INITIALISE OPENAI
------------------------------------------------------------- */
const openai = new OpenAI(process.env.OPENAI_API_KEY);

/* -------------------------------------------------------------
   LOAD FAISS METADATA (JSONL FILE)
------------------------------------------------------------- */
const META_PATH = "/mnt/data/chunks_metadata.final.jsonl";

let metadata = [];

try {
  console.log("🔍 Loading FAISS metadata...");
  metadata = fs
    .readFileSync(META_PATH, "utf-8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  console.log("✅ Loaded chunks:", metadata.length);
} catch (err) {
  console.error("❌ Could not load metadata:", err.message);
  metadata = [];
}

/* -------------------------------------------------------------
   COSINE SIMILARITY
------------------------------------------------------------- */
function cosine(a, b) {
  let dot = 0,
    na = 0,
    nb = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/* -------------------------------------------------------------
   EMBED QUERY TEXT USING ADA-002 (Accounting Pro method)
------------------------------------------------------------- */
async function embedQuery(text) {
  const emb = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });
  return emb.data[0].embedding;
}

/* -------------------------------------------------------------
   SEARCH FAISS (FULLY INLINE – NO EXTERNAL FILES)
------------------------------------------------------------- */
async function searchFaiss(text) {
  try {
    if (!metadata.length) return [];

    const queryVec = await embedQuery(text);

    const scored = metadata.map((m) => ({
      text: m.text,
      score: cosine(queryVec, m.embedding),
    }));

    return scored.sort((a, b) => b.score - a.score).slice(0, 20);
  } catch (err) {
    console.error("❌ FAISS search error:", err.message);
    return [];
  }
}

/* ------------------------------------------------------------- */

router.use(
  fileUpload({
    parseNested: true,
    useTempFiles: false,
    preserveExtension: true,
  })
);

/* -------------------------------------------------------------
   MAIN ROUTE — FULL FAISS ENABLED
------------------------------------------------------------- */
router.post("/check_invoice", async (req, res) => {
  try {
    console.log("🟢 /check_invoice");

    if (!req.files?.file) throw new Error("No file uploaded.");

    const file = req.files.file;

    const flags = {
      vatCategory: req.body.vatCategory,
      endUserConfirmed: req.body.endUserConfirmed,
      cisRate: req.body.cisRate,
    };

    const parsed = await parseInvoice(file.data);

    /* FAISS SEARCH */
    console.log("🔎 Searching FAISS index...");
    const matches = await searchFaiss(parsed.text);
    const filtered = matches.filter((m) => m.score >= 0.03);
    console.log("📌 FAISS chunks returned:", filtered.length);

    const faissContext = filtered.map((m) => m.text).join("\n\n");

    /* ANALYSE */
    const aiReply = await analyseInvoice(parsed.text, flags, faissContext);

    /* BUILD DOCUMENTS */
    const { docPath, pdfPath, timestamp } = await saveReportFiles(aiReply);

    /* SEND EMAIL */
    const to = req.body.userEmail;
    const ccList = [req.body.emailCopy1, req.body.emailCopy2];
    await sendReportEmail(to, ccList, docPath, pdfPath, timestamp);

    /* RESPONSE */
    res.json({
      parserNote: parsed.parserNote,
      aiReply,
      faissChunks: filtered.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ /check_invoice error:", err.message);
    res.status(500).json({
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
