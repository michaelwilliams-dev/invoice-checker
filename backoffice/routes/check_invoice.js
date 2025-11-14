/**
 * AIVS Invoice Compliance Checker · Express Route
 * ISO Timestamp: 2025-11-14T09:00:00Z
 * Author: AIVS Software Limited
 * Brand Colour: #4e65ac
 */

import express from "express";
import fileUpload from "express-fileupload";
import fs from "fs";
import fetch from "node-fetch";

import { parseInvoice, analyseInvoice } from "../invoice_tools.js";
import { saveReportFiles, sendReportEmail } from "../../server.js";

/* -------------------------------------------------------------
   FAISS LOADER
------------------------------------------------------------- */
const INDEX_PATH = "/mnt/data/vector.index";
const META_PATH = "/mnt/data/chunks_metadata.final.jsonl";

let metadata = [];

console.log("🔍 Loading FAISS index for Invoice Checker…");

if (fs.existsSync(META_PATH)) {
  try {
    metadata = fs
      .readFileSync(META_PATH, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map(JSON.parse);
    console.log("✅ FAISS metadata loaded:", metadata.length);
  } catch (e) {
    console.error("❌ Failed loading FAISS metadata:", e.message);
    metadata = [];
  }
} else {
  console.error("❌ No metadata file found. FAISS disabled.");
}

/* Cosine similarity */
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
   SAFE FAISS SEARCH — ALWAYS RETURNS, NEVER CRASHES
------------------------------------------------------------- */
async function searchFaissSafe(text) {
  try {
    if (metadata.length === 0) return [];

    const resp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input: text,
      }),
    });

    const data = await resp.json();

    // HARD FAIL CHECK — SHOW REAL EMBEDDING ERROR
    if (!data || !data.data || !Array.isArray(data.data)) {
      console.log("❌ EMBEDDING API RESPONSE:", JSON.stringify(data, null, 2));
      return [];
    }

    if (!data.data.length || !data.data[0].embedding) {
      console.log("❌ EMBEDDING API RESPONSE:", JSON.stringify(data, null, 2));
      return [];
    }

    const qVec = data.data[0].embedding;

    const scored = metadata.map((m) => ({
      text: m.text,
      score: cosine(qVec, m.embedding),
    }));

    return scored.sort((a, b) => b.score - a.score).slice(0, 6);

  } catch (err) {
    console.log("⚠️ FAISS error (non-blocking):", err.message);
    return [];
  }
}

/* ------------------------------------------------------------- */

const router = express.Router();

router.use(
  fileUpload({
    parseNested: true,
    useTempFiles: false,
    preserveExtension: true,
  })
);

router.post("/check_invoice", async (req, res) => {
  try {
    console.log("🟢 /check_invoice hit");

    if (!req.files || !req.files.file) {
      throw new Error("No invoice file received");
    }

    const file = req.files.file;

    const flags = {
      vatCategory: req.body.vatCategory,
      endUserConfirmed: req.body.endUserConfirmed,
      cisRate: req.body.cisRate,
    };

    const parsed = await parseInvoice(file.data);

    console.log("🔎 Running FAISS (safe)...");
    const faissHits = await searchFaissSafe(parsed.text);

    const faissContext = faissHits.map((h) => h.text).join("\n\n");

    const aiReply = await analyseInvoice(parsed.text, flags, faissContext);

    const { docPath, pdfPath, timestamp } = await saveReportFiles(aiReply);

    const to = req.body.userEmail;
    const ccList = [req.body.emailCopy1, req.body.emailCopy2];

    await sendReportEmail(to, ccList, docPath, pdfPath, timestamp);

    res.json({
      parserNote: parsed.parserNote,
      aiReply,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error("❌ /check_invoice error:", err.message);
    res
      .status(500)
      .json({ error: err.message, timestamp: new Date().toISOString() });
  }
});

export default router;
