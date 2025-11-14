/**
 * AIVS Invoice Compliance Checker · Express Route
 * ISO Timestamp: 2025-11-14T12:40:00Z
 * Author: AIVS Software Limited
 */

import express from "express";
import fileUpload from "express-fileupload";
import fs from "fs";
import OpenAI from "openai";

import { parseInvoice, analyseInvoice } from "../invoice_tools.js";
import { saveReportFiles, sendReportEmail } from "../../server.js";

const router = express.Router();
const openai = new OpenAI(process.env.OPENAI_API_KEY);

/* -------------------------------------------------------------
   LOAD FAISS METADATA
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

  console.log("✅ Loaded FAISS chunks:", metadata.length);
} catch (err) {
  console.error("❌ Failed to load FAISS metadata:", err.message);
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
   SAFE EMBEDDING FUNCTION (NO CRASHES)
------------------------------------------------------------- */

async function embedQuery(text) {
  try {
    const resp = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });

    if (!resp?.data?.[0]?.embedding) {
      console.log("❌ OpenAI embedding error:", JSON.stringify(resp, null, 2));
      return null;
    }

    return resp.data[0].embedding;

  } catch (err) {
    console.log("❌ OpenAI embedding exception:", err.message);
    return null;
  }
}

/* -------------------------------------------------------------
   SAFE FAISS SEARCH (ALWAYS RETURNS, NEVER CRASHES)
------------------------------------------------------------- */

async function searchFaiss(text) {
  try {
    if (!metadata.length) {
      console.log("⚠️ No FAISS metadata available.");
      return [];
    }

    const qVec = await embedQuery(text);

    if (!qVec) {
      console.log("⚠️ No embedding returned. FAISS skipped.");
      return [];
    }

    const scored = metadata.map((m) => ({
      text: m.text,
      score: cosine(qVec, m.embedding),
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
   MAIN ROUTE — FAISS ENABLED (SAFE)
------------------------------------------------------------- */

router.post("/check_invoice", async (req, res) => {
  try {
    console.log("🟢 /check_invoice HIT");

    if (!req.files?.file) throw new Error("No file uploaded.");

    const file = req.files.file;

    const flags = {
      vatCategory: req.body.vatCategory,
      endUserConfirmed: req.body.endUserConfirmed,
      cisRate: req.body.cisRate,
    };

    /* Parse invoice */
    const parsed = await parseInvoice(file.data);

    /* FAISS search */
    console.log("🔎 Running FAISS search…");

    const matches = await searchFaiss(parsed.text);
    console.log("🔍 Raw FAISS matches:", matches.length);
    console.log(
      "🔍 Top match preview:",
      matches[0]?.text?.slice(0, 200) || "NONE"
    );

    const filtered = matches.filter((m) => m.score >= 0.03);
    console.log("📌 FAISS chunks used:", filtered.length);

    const faissContext = filtered.map((m) => m.text).join("\n\n");

    /* AI analysis */
    const aiReply = await analyseInvoice(parsed.text, flags, faissContext);

    /* Build reports */
    const { docPath, pdfPath, timestamp } = await saveReportFiles(aiReply);

    /* Email */
    const to = req.body.userEmail || "";
    const ccList = [req.body.emailCopy1, req.body.emailCopy2].filter(Boolean);

    await sendReportEmail(to, ccList, docPath, pdfPath, timestamp);

    /* Response */
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
